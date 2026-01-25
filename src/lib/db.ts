import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { cache } from 'react'
import * as schema from '@/db/schema'

async function getConnectionString(): Promise<string> {
  // Cloudflare Workers環境でHyperdriveが利用可能な場合
  if (typeof globalThis !== 'undefined' && 'caches' in globalThis) {
    try {
      const { getCloudflareContext } = await import('@opennextjs/cloudflare')
      const { env } = getCloudflareContext()
      const hyperdrive = (env as { HYPERDRIVE?: { connectionString: string } }).HYPERDRIVE
      if (hyperdrive?.connectionString) {
        return hyperdrive.connectionString
      }
    } catch {
      // Hyperdrive未設定の場合はフォールバック
    }
  }

  // ローカル開発環境ではDATABASE_URLを使用
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined')
  }
  return process.env.DATABASE_URL
}

export const getDb = cache(async () => {
  const connectionString = await getConnectionString()
  const client = postgres(connectionString)
  return drizzle(client, { schema })
})

export type DbClient = Awaited<ReturnType<typeof getDb>>
