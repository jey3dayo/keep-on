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
    max: 2, // 並行RSCリクエストを吸収（フェーズ2: 接続プール最適化）
    idle_timeout: 10, // アイドルタイムアウト（秒） - 早めに解放
    connect_timeout: 3, // 接続タイムアウト（秒） - 失敗を速く（5→3秒に短縮）
    debug: (connectionId, query, parameters) => {
      if (!TRACE_QUERY_RE.test(query)) {
        return
      }
      const trimmed = query.replace(/\s+/g, ' ').slice(0, 200)
      const paramsCount = Array.isArray(parameters) ? parameters.length : 0
      logInfo('db.query.dispatch', { connectionId, query: trimmed, paramsCount })
    },
    connection: {
      statement_timeout: 5000, // クエリのハングを防ぐ（ミリ秒） - 失敗を速く（8000→5000msに短縮）
    },
  })

  const probeStart = nowMs()
  logInfo('db.connection.probe:start', { source, ...meta })
  try {
    await client.unsafe('select 1')
    const ms = Math.round(nowMs() - probeStart)
    logInfo('db.connection.probe:end', { source, ...meta, ms })
  } catch (error) {
    const ms = Math.round(nowMs() - probeStart)
    logWarn('db.connection.probe:error', { source, ...meta, ms, error: formatError(error) })
    try {
      await client.end({ timeout: 1 })
    } catch (closeError) {
      logWarn('db.connection.probe:cleanup-error', { source, ...meta, error: formatError(closeError) })
    }
    throw error
  }

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

  try {
    return await globalForDb.__dbPromise
  } catch (error) {
    globalForDb.__dbClient = undefined
    globalForDb.__dbPromise = undefined
    throw error
  }
}

export async function resetDb(reason?: string) {
  const client = globalForDb.__dbClient
  globalForDb.__dbClient = undefined
  globalForDb.__dbPromise = undefined

  if (!client) {
    return
  }

  try {
    const timeout = isWorkersRuntime() ? 1 : 5
    await client.end({ timeout })
  } catch (error) {
    logWarn('db.connection:reset-error', { reason, error: formatError(error) })
  }
}
