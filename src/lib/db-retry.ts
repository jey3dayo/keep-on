import { formatError, isDatabaseError, logSpan, logWarn } from '@/lib/logging'
import { resetDb } from './db'

interface RetryOptions {
  maxRetries?: number
  onRetry?: (attempt: number, error: unknown) => Promise<void>
  retryOn?: (error: unknown) => boolean
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
 *   () => getHabitsWithProgress(userId, externalId, dateKey, weekStart),
 *   { timeoutMs: 8000 }
 * )
 * ```
 */
export async function withDbRetry<T>(name: string, fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxRetries = 1,
    retryOn = isDatabaseError,
    onRetry = () => {
      resetDb()
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
        // D1 の read query は platform 側で内部リトライ済み（最大2回、公式 changelog:
        // https://developers.cloudflare.com/changelog/post/2025-09-11-d1-automatic-read-retries/）。
        // ここでの再試行は outer timeout（logSpan の Promise.race）の予算内に収める必要があり、
        // かつ D1 は1クエリ=1往復のためその往復自体が試行間隔になる。そのため遅延を入れず即座に次の試行へ進む。
        // クライアント側の RETRY_DELAY_MS（Server Action 全体の再送）とは契約が異なるため揃える必要はない。
        if (retryOn(error)) {
          // 最終試行でない場合は通常のリトライ
          if (attempt < maxRetries) {
            logWarn(`${name}:retry`, {
              attempt: attempt + 1,
              error: formatError(error),
              maxRetries,
            })
            await onRetry(attempt + 1, error)
          } else {
            // 最終試行でも失敗した場合、DBをリセットしてからエラーを投げる
            logWarn(`${name}:final-failure`, {
              attempt: attempt + 1,
              error: formatError(error),
              maxRetries,
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
