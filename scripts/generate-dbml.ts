import { resolve } from 'node:path'
import { sqliteGenerate } from 'drizzle-docs-generator'
import * as schema from '../src/db/schema'

sqliteGenerate({
  schema,
  source: resolve('./src/db/schema.ts'),
  out: './docs/database/schema.dbml',
})

console.log('✅ DBML generated successfully: docs/database/schema.dbml')
