import { readFileSync } from 'node:fs'
import ts from 'typescript'

export interface SchemaComments {
  tables: Record<
    string,
    {
      comment?: string
      columns: Record<string, { comment: string }>
    }
  >
}

/**
 * TypeScript Compiler APIを使用してスキーマファイルからJSDocコメントを抽出する
 * @param schemaPath - スキーマファイルのパス (src/db/schema.ts)
 * @returns テーブル・カラムのコメント情報
 */
export function extractSchemaComments(schemaPath: string): SchemaComments {
  const sourceText = readFileSync(schemaPath, 'utf-8')
  const sourceFile = ts.createSourceFile(schemaPath, sourceText, ts.ScriptTarget.Latest, true)

  const result: SchemaComments = { tables: {} }

  // VariableStatementを走査
  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isVariableStatement(node)) {
      return
    }
    const tableInfo = extractTableInfo(node, sourceFile)
    if (tableInfo) {
      result.tables[tableInfo.sqlTableName] = {
        comment: tableInfo.tableComment,
        columns: tableInfo.columns,
      }
    }
  })

  return result
}

/**
 * VariableStatementからテーブル情報を抽出
 */
function extractTableInfo(
  node: ts.VariableStatement,
  sourceFile: ts.SourceFile
): { sqlTableName: string; tableComment?: string; columns: Record<string, { comment: string }> } | undefined {
  // JSDocコメントを取得
  const tableComment = extractJSDocComment(node, sourceFile)

  // 変数宣言を取得
  const declaration = node.declarationList.declarations[0]
  if (!(declaration && ts.isVariableDeclaration(declaration))) {
    return undefined
  }

  // 初期化子を取得
  const initializer = declaration.initializer
  if (!(initializer && ts.isCallExpression(initializer))) {
    return undefined
  }

  // sqliteTable('TableName', { ... }) のパターンを検出
  const functionName = initializer.expression.getText(sourceFile)
  if (functionName !== 'sqliteTable') {
    return undefined
  }

  // 第1引数: テーブルSQL名
  const sqlTableName = getSqlTableName(initializer)
  if (!sqlTableName) {
    return undefined
  }

  // 第2引数: カラム定義オブジェクト
  const columnsObject = initializer.arguments[1]
  if (!(columnsObject && ts.isObjectLiteralExpression(columnsObject))) {
    return undefined
  }

  // カラムコメントを抽出
  const columns: Record<string, { comment: string }> = {}
  for (const property of columnsObject.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue
    }

    const columnComment = extractJSDocComment(property, sourceFile)
    if (columnComment) {
      // SQL名を抽出
      const sqlColumnName = extractSqlColumnName(property)
      if (sqlColumnName) {
        columns[sqlColumnName] = { comment: columnComment }
      }
    }
  }

  return { sqlTableName, tableComment, columns }
}

/**
 * ノードからJSDocコメントを抽出
 */
function extractJSDocComment(node: ts.Node, sourceFile: ts.SourceFile): string | undefined {
  const fullText = sourceFile.getFullText()
  const commentRanges = ts.getLeadingCommentRanges(fullText, node.pos)

  if (!commentRanges || commentRanges.length === 0) {
    return undefined
  }

  // 直前のJSDocコメントを取得
  const lastComment = commentRanges.at(-1)
  if (!lastComment || lastComment.kind !== ts.SyntaxKind.MultiLineCommentTrivia) {
    return undefined
  }

  const commentText = fullText.slice(lastComment.pos, lastComment.end)
  if (!commentText.startsWith('/**')) {
    return undefined
  }

  // /** と */ を除去し、行頭の * を削除
  const lines = commentText
    .slice(3, -2)
    .split('\n')
    .map((line) => line.trim().replace(/^\* ?/, ''))
    .filter((line) => line.length > 0)

  return lines.join('\n')
}

/**
 * sqliteTable('TableName', ...) の第1引数からSQL名を取得
 */
function getSqlTableName(callExpr: ts.CallExpression): string | undefined {
  const firstArg = callExpr.arguments[0]
  if (!(firstArg && ts.isStringLiteral(firstArg))) {
    return undefined
  }
  return firstArg.text
}

/**
 * text('clerkId') のような関数呼び出しの第1引数からSQL名を抽出
 */
function extractSqlColumnName(property: ts.PropertyAssignment): string | undefined {
  // メソッドチェーンをたどって先頭の関数呼び出しを見つける
  let expr: ts.Expression = property.initializer

  while (ts.isCallExpression(expr)) {
    // さらにチェーンがあるか確認
    if (ts.isPropertyAccessExpression(expr.expression)) {
      expr = expr.expression.expression
      continue
    }

    // チェーンの先頭に到達（text('clerkId') など）
    const firstArg = expr.arguments[0]
    if (firstArg && ts.isStringLiteral(firstArg)) {
      return firstArg.text
    }
    break
  }

  return undefined
}
