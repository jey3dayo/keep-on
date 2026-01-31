import { formatError, logError, logInfo, logWarn, nowMs } from '@/lib/logging'

/**
 * プロファイリング付きクエリ実行
 *
 * クエリ関数をラップして実行時間を計測し、ログに記録します。
 * スローク��リ（100ms以上）は警告ログとして出力します。
 *
 * @param name - クエリ名（例: "query.getHabitById"）
 * @param queryFn - 実行するクエリ関数
 * @param meta - ログに含めるメタデータ
 * @returns クエリ結果
 */
export async function profileQuery<T>(
  name: string,
  queryFn: () => Promise<T>,
  meta?: Record<string, unknown>
): Promise<T> {
  const start = nowMs()

  try {
    const result = await queryFn()
    const ms = Math.round(nowMs() - start)

    // スロークエリ検出（100ms 以上）
    if (ms > 100) {
      logWarn(`${name}:slow`, { ...meta, ms })
    } else {
      logInfo(`${name}:complete`, { ...meta, ms })
    }

    return result
  } catch (error) {
    const ms = Math.round(nowMs() - start)
    logError(`${name}:error`, { ...meta, ms, error: formatError(error) })
    throw error
  }
}
