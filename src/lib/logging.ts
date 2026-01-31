type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

class TimeoutError extends Error {
  readonly timeoutMs: number

  constructor(name: string, timeoutMs: number) {
    super(`${name} timed out after ${timeoutMs}ms`)
    this.name = 'TimeoutError'
    this.timeoutMs = timeoutMs
  }
}

export function isTimeoutError(error: unknown): error is TimeoutError {
  if (error instanceof TimeoutError) {
    return true
  }
  if (!error || typeof error !== 'object') {
    return false
  }
  return (error as { name?: string }).name === 'TimeoutError'
}

/**
 * データベースエラーかどうかを判定
 *
 * タイムアウトエラー、接続エラー、ネットワークエラー、
 * クエリエラーなど、リトライ可能なDB関連エラーを検出します。
 *
 * schemas/db.ts の classifyConnectionError() を使用して
 * 型安全にエラーを分類します。
 */
export function isDatabaseError(error: unknown): boolean {
  // classifyConnectionError() を遅延インポートして使用
  // これにより循環依存を回避しつつ、型安全なエラー分類を利用
  const { classifyConnectionError } = require('@/schemas/db')
  const errorType = classifyConnectionError(error)

  // 'unknown' と 'auth' 以外はリトライ対象のDB関連エラー
  // - 'timeout': タイムアウトエラー（リトライ可能）
  // - 'network': ネットワークエラー（リトライ可能）
  // - 'connection': 接続エラー（リトライ可能）
  // - 'auth': 認証エラー（リトライ不可 - 設定の問題）
  // - 'unknown': 不明なエラー（リトライ不可 - 予期しないエラー）
  return errorType === 'timeout' || errorType === 'network' || errorType === 'connection'
}

let cachedLogLevel: LogLevel | null = null

function resolveLogLevel(): LogLevel {
  if (cachedLogLevel) {
    return cachedLogLevel
  }

  const rawLevel = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.LOG_LEVEL
  const normalized = typeof rawLevel === 'string' ? rawLevel.toLowerCase() : ''
  cachedLogLevel =
    normalized === 'debug' || normalized === 'info' || normalized === 'warn' || normalized === 'error'
      ? (normalized as LogLevel)
      : 'info'

  return cachedLogLevel
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[resolveLogLevel()]
}

export function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }
  return Date.now()
}

export function formatError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message }
  }
  return { name: 'UnknownError', message: String(error) }
}

function formatLine(message: string, data?: Record<string, unknown>): string {
  if (!data) {
    return message
  }
  return `${message} ${JSON.stringify(data)}`
}

export function logInfo(message: string, data?: Record<string, unknown>): void {
  if (!shouldLog('info')) {
    return
  }
  console.info(formatLine(message, data))
}

export function logWarn(message: string, data?: Record<string, unknown>): void {
  if (!shouldLog('warn')) {
    return
  }
  console.warn(formatLine(message, data))
}

export function logError(message: string, data?: Record<string, unknown>): void {
  if (!shouldLog('error')) {
    return
  }
  console.error(formatLine(message, data))
}

export function createRequestMeta(route: string): { route: string; requestId: string } {
  const requestId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

  return { route, requestId }
}

export async function logSpan<T>(
  name: string,
  fn: () => Promise<T>,
  data?: Record<string, unknown>,
  options?: { timeoutMs?: number }
): Promise<T> {
  const start = nowMs()
  logInfo(`${name}:start`, data)
  const timeoutMs = options?.timeoutMs
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let timedOut = false

  const timeoutPromise =
    typeof timeoutMs === 'number' && timeoutMs > 0
      ? new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            timedOut = true
            logError(`${name}:timeout`, data ? { ...data, ms: timeoutMs } : { ms: timeoutMs })
            reject(new TimeoutError(name, timeoutMs))
          }, timeoutMs)
        })
      : null

  try {
    // fn() に .catch() を追加して、タイムアウト勝利時の unhandled rejection を防止
    const fnPromise = fn().catch((error) => {
      if (timedOut) {
        // タイムアウト済みの場合はエラーを無視（ログのみ出力）
        logError(`${name}:late-error`, data ? { ...data, error: formatError(error) } : { error: formatError(error) })
        return undefined as T
      }
      throw error
    })

    const result = await (timeoutPromise ? Promise.race([fnPromise, timeoutPromise]) : fn())
    const ms = Math.round(nowMs() - start)
    logInfo(`${name}:end`, data ? { ...data, ms } : { ms })
    return result
  } catch (error) {
    if (error instanceof TimeoutError && timedOut) {
      throw error
    }
    const ms = Math.round(nowMs() - start)
    logError(`${name}:error`, data ? { ...data, ms, error: formatError(error) } : { ms, error: formatError(error) })
    throw error
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

export async function logSpanOptional<T>(
  name: string,
  fn: () => Promise<T>,
  data?: Record<string, unknown>,
  options?: { timeoutMs?: number }
): Promise<T | null> {
  try {
    return await logSpan(name, fn, data, options)
  } catch (error) {
    if (isTimeoutError(error)) {
      return null
    }
    throw error
  }
}
