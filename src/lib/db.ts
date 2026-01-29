import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/db/schema'
import { formatError, logError, logInfo } from '@/lib/logging'
import { safeParseCloudflareEnvBindings } from '@/schemas/cloudflare'

function isWorkersRuntime(): boolean {
  return typeof globalThis !== 'undefined' && 'caches' in globalThis
}

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

type ConnectionSource = 'hyperdrive' | 'env'

interface ConnectionInfo {
  connectionString: string
  source: ConnectionSource
}

function getConnectionMeta(connectionString: string): { host?: string; port?: number; protocol?: string } {
  try {
    const url = new URL(connectionString)
    return {
      host: url.hostname || undefined,
      port: url.port ? Number(url.port) : undefined,
      protocol: url.protocol ? url.protocol.replace(':', '') : undefined,
    }
  } catch {
    return {}
  }
}

async function getConnectionInfo(): Promise<ConnectionInfo> {
  // Cloudflare Workers環境でHyperdriveが利用可能な場合
  if (isWorkersRuntime()) {
    try {
      const { getCloudflareContext } = await import('@opennextjs/cloudflare')
      const { env } = getCloudflareContext()
      const parsedBindings = safeParseCloudflareEnvBindings(env)
      if (parsedBindings.success) {
        const { HYPERDRIVE, DATABASE_URL } = parsedBindings.output
        if (HYPERDRIVE?.connectionString) {
          return { connectionString: HYPERDRIVE.connectionString, source: 'hyperdrive' }
        }
        if (DATABASE_URL) {
          return { connectionString: DATABASE_URL, source: 'env' }
        }
      } else {
        logError('db.connection:invalid-bindings', { issues: parsedBindings.issues })
      }
    } catch (error) {
      logError('db.connection:context-error', { error: formatError(error) })
    }

    logError('db.connection:missing-binding', { bindings: ['HYPERDRIVE', 'DATABASE_URL'] })
    throw new Error('Database connection is not configured. Set HYPERDRIVE or DATABASE_URL in Workers bindings.')
  }

  // ローカル開発環境ではDATABASE_URLを使用
  const { env } = await import('@/env')
  return { connectionString: env.DATABASE_URL, source: 'env' }
}

async function createDb() {
  const { connectionString: rawConnectionString, source } = await getConnectionInfo()
  const connectionString = normalizeConnectionString(rawConnectionString)
  const meta = getConnectionMeta(connectionString)
  logInfo('db.connection', { source, ...meta })

  // Cloudflare Workers最適化設定
  const client = postgres(connectionString, {
    prepare: false, // PgBouncer互換モード
    fetch_types: false, // 型フェッチを無効化（Workers環境では不要）
    max: 2, // Workers環境では最小限の接続数に抑える
    idle_timeout: 20, // アイドルタイムアウト（秒）
    connect_timeout: 5, // 接続タイムアウト（秒） - Workersの30秒制限内に収めるため短縮
    connection: {
      statement_timeout: 8000, // クエリのハングを防ぐ（ミリ秒）
    },
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
