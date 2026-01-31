import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import {
  DB_CONNECT_TIMEOUT,
  DB_CONNECTION_POOL_MAX,
  DB_IDLE_TIMEOUT,
  DB_MAX_LIFETIME,
  DB_STATEMENT_TIMEOUT,
} from '@/constants/db'
import * as schema from '@/db/schema'
import { formatError, logError, logInfo, logWarn } from '@/lib/logging'
import { safeParseCloudflareEnvBindings } from '@/schemas/cloudflare'
import { classifyConnectionError } from '@/schemas/db'

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

/**
 * 接続プローブ: 接続の健全性確認と状態クリーンアップ
 *
 * - DISCARD ALL で接続状態をリセット
 * - statement_timeout を再設定（DISCARD ALL でリセットされるため）
 * - pg_backend_pid() で接続ID・DB名を取得してログに記録
 */
async function probeConnection(
  client: DbClient,
  source: ConnectionSource,
  meta: Record<string, unknown>
): Promise<{ pid: number | null; db: string | null }> {
  const probeStart = nowMs()
  logInfo('db.connection.probe:start', { source, ...meta })

  try {
    // 接続状態のクリーンアップ（新規接続の初期化）
    await client.unsafe('DISCARD ALL')
    logInfo('db.connection:cleanup', { source, ...meta })

    // DISCARD ALL により statement_timeout がリセットされるため再設定
    // これがないとクエリタイムアウトが無効化され、ハングしたクエリが無制限に実行される
    await client.unsafe(`SET statement_timeout = ${DB_STATEMENT_TIMEOUT}`)
    logInfo('db.connection:reapply-timeout', { source, ...meta, timeoutMs: DB_STATEMENT_TIMEOUT })

    // 接続情報取得（デバッグ用）
    const result = await client.unsafe<{ pid: number; db: string }[]>(
      'SELECT pg_backend_pid() as pid, current_database() as db'
    )
    const pid = result[0]?.pid ?? null
    const db = result[0]?.db ?? null

    const ms = Math.round(nowMs() - probeStart)
    logInfo('db.connection.probe:end', { source, ...meta, ms, pid, db })

    return { pid, db }
  } catch (error) {
    const ms = Math.round(nowMs() - probeStart)
    const errorType = classifyConnectionError(error)
    logWarn('db.connection.probe:error', {
      source,
      ...meta,
      ms,
      errorType,
      error: formatError(error),
    })
    throw error
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
    max: DB_CONNECTION_POOL_MAX, // 並行RSCリクエストを吸収
    idle_timeout: DB_IDLE_TIMEOUT, // アイドルタイムアウト（秒） - 早めに解放
    connect_timeout: DB_CONNECT_TIMEOUT, // 接続タイムアウト（秒） - 失敗を速く検出
    max_lifetime: DB_MAX_LIFETIME, // 接続の最大生存時間（秒） - 定期的にリフレッシュ
    debug: (connectionId, query, parameters) => {
      if (!TRACE_QUERY_RE.test(query)) {
        return
      }
      const trimmed = query.replace(/\s+/g, ' ').slice(0, 200)
      const paramsCount = Array.isArray(parameters) ? parameters.length : 0
      logInfo('db.query.dispatch', { connectionId, query: trimmed, paramsCount })
    },
    connection: {
      statement_timeout: DB_STATEMENT_TIMEOUT, // クエリのハングを防ぐ（ミリ秒）
    },
  })

  try {
    await probeConnection(client, source, meta)
  } catch (error) {
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
  __retryLock?: Promise<void>
}

export async function getDb() {
  if (!globalForDb.__dbPromise) {
    globalForDb.__dbPromise = createDb()
  }

  try {
    return await globalForDb.__dbPromise
  } catch (error) {
    // 接続失敗時はプールをクリアして1回だけリトライ
    const errorType = classifyConnectionError(error)
    logWarn('db.connection:initial-failure', { errorType, error: formatError(error) })

    // リトライ対象エラーでない場合は即座に投げる
    if (errorType !== 'connection' && errorType !== 'network' && errorType !== 'timeout') {
      throw error
    }

    // ミューテックスパターン: 既に別のリクエストがリトライ中の場合は待機
    if (globalForDb.__retryLock) {
      try {
        logInfo('db.connection:await-retry-lock', { errorType })
        await globalForDb.__retryLock
        // ロック解放後、新しい接続が利用可能か確認
        if (globalForDb.__dbPromise) {
          return await globalForDb.__dbPromise
        }
      } catch (lockError) {
        // ロック中のリトライが失敗した場合も続行
        logWarn('db.connection:lock-retry-failed', { error: formatError(lockError) })
      }
    }

    // リトライロックを作成（他のリクエストはこれを待機する）
    let releaseLock: (() => void) | undefined
    globalForDb.__retryLock = new Promise<void>((resolve) => {
      releaseLock = resolve
    })

    try {
      // プールをクリア
      globalForDb.__dbClient = undefined
      globalForDb.__dbPromise = undefined

      logInfo('db.connection:retry', { errorType })
      globalForDb.__dbPromise = createDb()

      const result = await globalForDb.__dbPromise
      return result
    } catch (retryError) {
      logError('db.connection:retry-failed', { error: formatError(retryError) })
      globalForDb.__dbClient = undefined
      globalForDb.__dbPromise = undefined
      throw retryError
    } finally {
      // ロックを解放
      globalForDb.__retryLock = undefined
      releaseLock?.()
    }
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
