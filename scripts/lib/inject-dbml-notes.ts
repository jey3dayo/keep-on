import type { SchemaComments } from './extract-jsdoc'

/**
 * drizzle-dbml-generatorの出力DBMLにnoteを後付けする
 * @param baseDbml - drizzle-dbml-generatorが生成した基本DBML
 * @param comments - テーブル・カラムのコメント情報
 * @returns noteが注入されたDBML
 */
export function injectDbmlNotes(baseDbml: string, comments: SchemaComments): string {
  let result = baseDbml

  // テーブルごとに処理
  for (const [tableName, tableInfo] of Object.entries(comments.tables)) {
    // テーブルブロックを正規表現で検索
    const tablePattern = new RegExp(`table ${tableName} \\{([^}]+)\\}`, 's')
    const match = result.match(tablePattern)

    if (!match) {
      continue
    }

    const originalBlock = match[0]
    const tableContent = match[1]

    // カラム行にnoteを追加
    let updatedContent = tableContent
    for (const [columnName, columnInfo] of Object.entries(tableInfo.columns)) {
      // カラム行のパターン: "id text [pk, not null]"
      const columnPattern = new RegExp(`(\\s+${columnName}\\s+[^\\[\\n]+\\[)([^\\]]+)(\\])`, 'g')
      updatedContent = updatedContent.replace(columnPattern, (_, prefix, attrs, suffix) => {
        const escapedComment = escapeDbmlNote(columnInfo.comment)
        // 既存の属性の後にnoteを追加
        return `${prefix}${attrs}, note: '${escapedComment}'${suffix}`
      })
    }

    // テーブルコメントをNote行として追加
    let newBlock = `table ${tableName} {${updatedContent}`
    if (tableInfo.comment) {
      const escapedTableComment = escapeDbmlNote(tableInfo.comment)
      // indexes ブロックの前にNote行を挿入
      if (newBlock.includes('indexes {')) {
        newBlock = newBlock.replace(/(\s+indexes \{)/, `\n  Note: '${escapedTableComment}'\n$1`)
      } else {
        // indexes がない場合は閉じ括弧の直前に挿入
        newBlock = `${newBlock.trimEnd()}\n\n  Note: '${escapedTableComment}'\n}`
      }
    } else {
      newBlock += '}'
    }

    // 元のブロックを置換
    result = result.replace(originalBlock, newBlock)
  }

  return result
}

/**
 * DBML note用の文字列エスケープ
 * シングルクォートをエスケープし、改行を \n に変換
 */
function escapeDbmlNote(text: string): string {
  return text.replace(/'/g, "\\'").replace(/\n/g, '\\n')
}
