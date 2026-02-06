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
    const tableBlock = findTableBlock(result, tableName)
    if (!tableBlock) {
      continue
    }

    // カラム行にnoteを追加
    let updatedContent = tableBlock.body
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
    let newContent = updatedContent
    if (tableInfo.comment) {
      const escapedTableComment = escapeDbmlNote(tableInfo.comment)
      // indexes ブロックの前にNote行を挿入
      if (newContent.includes('indexes {')) {
        newContent = newContent.replace(/(\n\s*indexes \{)/, `\n  Note: '${escapedTableComment}'$1`)
      } else {
        // indexes がない場合は閉じ括弧の直前に挿入
        newContent = `${newContent.trimEnd()}\n\n  Note: '${escapedTableComment}'\n`
      }
    }

    // 元のブロックを置換
    const newBlock = `${tableBlock.header}${newContent}}`
    result = `${result.slice(0, tableBlock.start)}${newBlock}${result.slice(tableBlock.end + 1)}`
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

function findTableBlock(
  source: string,
  tableName: string
): { start: number; end: number; header: string; body: string } | null {
  const headerPattern = new RegExp(`table\\s+${escapeRegExp(tableName)}\\s*\\{`, 'g')
  const match = headerPattern.exec(source)
  if (!match) {
    return null
  }

  const start = match.index
  const headerEnd = start + match[0].length
  let depth = 1
  let inString = false

  for (let i = headerEnd; i < source.length; i += 1) {
    const char = source[i]
    if (char === "'" && source[i - 1] !== '\\') {
      inString = !inString
      continue
    }
    if (inString) {
      continue
    }
    if (char === '{') {
      depth += 1
      continue
    }
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return {
          start,
          end: i,
          header: source.slice(start, headerEnd),
          body: source.slice(headerEnd, i),
        }
      }
    }
  }

  return null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
