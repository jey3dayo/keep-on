import { defineConfig } from 'drizzle-kit'

// drizzle-kit generate はDB接続不要のため、環境変数がなくてもスキーマ生成可能にする
const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/dummy'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
})
