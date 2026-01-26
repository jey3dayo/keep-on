import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/db/schema'
import { env } from '@/env'

function normalizeConnectionString(raw: string): string {
  try {
    const url = new URL(raw)
    // pgbouncerパラメータをクエリ文字列から削除
    if (url.searchParams.has('pgbouncer')) {
      url.searchParams.delete('pgbouncer')
    }
    return url.toString()
  } catch {
    return raw
  }
}

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
  return env.DATABASE_URL
}

async function createDb() {
  const rawConnectionString = await getConnectionString()
  const connectionString = normalizeConnectionString(rawConnectionString)

  // Cloudflare Workers最適化設定
  const client = postgres(connectionString, {
    prepare: false, // PgBouncer互換モード
    fetch_types: false, // 型フェッチを無効化（Workers環境では不要）
    max: 1, // Workers環境では1接続のみ
    idle_timeout: 20, // アイドルタイムアウト（秒）
    connect_timeout: 5, // 接続タイムアウト（秒） - Workersの30秒制限内に収めるため短縮
  })

  return drizzle(client, { schema })
}

type DbPromise = ReturnType<typeof createDb>

const globalForDb = globalThis as typeof globalThis & {
  __dbPromise?: DbPromise
}

export async function getDb() {
  if (!globalForDb.__dbPromise) {
    globalForDb.__dbPromise = createDb()
  }

  return await globalForDb.__dbPromise
}
