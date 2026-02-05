import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { extractComments, sqliteGenerate } from 'drizzle-docs-generator'
import * as schema from '../src/db/schema'

const out = './docs/database/schema.dbml'
const schemaPath = resolve('./src/db/schema.ts')

// スキーマファイルからJSDocコメントを抽出（パスを渡す）
const comments = extractComments(schemaPath)

const relationalSchema = {
  users: schema.users,
  habits: schema.habits,
  checkins: schema.checkins,
}

// SQLiteスキーマからDBMLを生成
const dbml = sqliteGenerate({
  schema: relationalSchema,
  comments,
})

// ディレクトリを確実に作成
mkdirSync(dirname(out), { recursive: true })

// DBMLファイルを書き込み
writeFileSync(out, dbml)

console.log(`✅ DBML generated successfully: ${out}`)
