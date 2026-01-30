import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/db/schema'
import { formatError, logError, logInfo, logWarn } from '@/lib/logging'
import { safeParseCloudflareEnvBindings } from '@/schemas/cloudflare'

const TRACE_QUERY_RE = /from "User"|from "Habit"|from "Checkin"/

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

function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }
  return Date.now()
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
    max: 1, // Hyperdrive経由なのでWorkers側は1接続で十分（Supabase無料枠対策）
    idle_timeout: 10, // アイドルタイムアウト（秒） - 早めに解放
    connect_timeout: 5, // 接続タイムアウト（秒） - Workersの30秒制限内に収めるため短縮
    debug: (connectionId, query, parameters) => {
      if (!TRACE_QUERY_RE.test(query)) {
        return
      }
      const trimmed = query.replace(/\s+/g, ' ').slice(0, 200)
      const paramsCount = Array.isArray(parameters) ? parameters.length : 0
      logInfo('db.query.dispatch', { connectionId, query: trimmed, paramsCount })
    },
    connection: {
      statement_timeout: 8000, // クエリのハングを防ぐ（ミリ秒） - 早期失敗
    },
  })

  const probeStart = nowMs()
  logInfo('db.connection.probe:start', { source, ...meta })
  client
    .unsafe('select 1')
    .then(() => {
      const ms = Math.round(nowMs() - probeStart)
      logInfo('db.connection.probe:end', { source, ...meta, ms })
    })
    .catch((error) => {
      const ms = Math.round(nowMs() - probeStart)
      logWarn('db.connection.probe:error', { source, ...meta, ms, error: formatError(error) })
    })

  globalForDb.__dbClient = client
  return drizzle(client, { schema })
}

type DbPromise = ReturnType<typeof createDb>
type DbClient = ReturnType<typeof postgres>

const globalForDb = globalThis as typeof globalThis & {
  __dbPromise?: DbPromise
  __dbClient?: DbClient
}

export async function getDb() {
  if (!globalForDb.__dbPromise) {
    globalForDb.__dbPromise = createDb()
  }

  return await globalForDb.__dbPromise
}

export async function resetDb(reason?: string) {
  const client = globalForDb.__dbClient
  globalForDb.__dbClient = undefined
  globalForDb.__dbPromise = undefined

  if (!client) {
    return
  }

  try {
    await client.end({ timeout: 1 })
  } catch (error) {
    logWarn('db.connection:reset-error', { reason, error: formatError(error) })
  }
}
