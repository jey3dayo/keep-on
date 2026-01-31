import { formatError, isDatabaseError, logSpan, logWarn } from '@/lib/logging'
import { resetDb } from './db'

interface RetryOptions {
  maxRetries?: number
  retryOn?: (error: unknown) => boolean
  onRetry?: (attempt: number, error: unknown) => Promise<void>
  timeoutMs?: number
}

/**
 * データベースクエリをリトライ付きで実行
 *
 * リトライループ全体に対してタイムアウトを適用します。
 * 各リトライごとにタイムアウトがリセットされることはありません。
 *
 * デフォルトでは、タイムアウト、接続エラー、statement_timeout など、
 * 一時的なDB関連エラー全般に対してリトライを実行します。
 *
 * @param name - クエリ名（ログ用）
 * @param fn - 実行する関数
 * @param options - リトライオプション
 * @returns クエリ結果
 *
 * @example
 * ```typescript
 * const habits = await withDbRetry(
 *   'dashboard.habits',
 *   () => getHabitsWithProgress(userId, clerkId, dateKey, weekStart),
 *   { timeoutMs: 8000 }
 * )
 * ```
 */
export async function withDbRetry<T>(name: string, fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxRetries = 1,
    retryOn = isDatabaseError,
    onRetry = async () => {
      await resetDb(`${name} retry`)
    },
    timeoutMs,
  } = options

  // リトライループ全体を単一のタイムアウトで包む
  const retryLoop = async (): Promise<T> => {
    let lastError: unknown

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error

        // リトライ対象エラーの場合
        if (retryOn(error)) {
          // 最終試行でない場合は通常のリトライ
          if (attempt < maxRetries) {
            logWarn(`${name}:retry`, {
              attempt: attempt + 1,
              maxRetries,
              error: formatError(error),
            })
            await onRetry(attempt + 1, error)
          } else {
            // 最終試行でも失敗した場合、DBをリセットしてからエラーを投げる
            logWarn(`${name}:final-failure`, {
              attempt: attempt + 1,
              maxRetries,
              error: formatError(error),
            })
            await onRetry(attempt + 1, error)
            throw error
          }
        } else {
          // リトライ対象外エラーは即座に投げる
          throw error
        }
      }
    }

    throw lastError
  }

  // タイムアウトが指定されている場合は、リトライループ全体に適用
  if (timeoutMs) {
    return await logSpan(name, retryLoop, {}, { timeoutMs })
  }

  return await retryLoop()
}
