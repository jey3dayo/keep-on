import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { sqliteGenerate } from 'drizzle-dbml-generator'
import * as schema from '../src/db/schema'
import { extractSchemaComments } from './lib/extract-jsdoc'
import { injectDbmlNotes } from './lib/inject-dbml-notes'

const outPath = './docs/database/schema.dbml'
const schemaPath = resolve('./src/db/schema.ts')

// 1. DBML生成（noteなし）
const baseDbml = sqliteGenerate({ schema })

// 2. JSDocコメント抽出
const comments = extractSchemaComments(schemaPath)

// 3. note注入
const dbml = injectDbmlNotes(baseDbml, comments)

// 4. ファイル書き込み
writeFileSync(outPath, dbml)

console.log('✅ DBML generated successfully: docs/database/schema.dbml')
