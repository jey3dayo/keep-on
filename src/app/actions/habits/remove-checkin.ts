'use server'

import { deleteLatestCheckinByHabitAndPeriod } from '@/lib/queries/checkin'
import {
  type HabitCheckinParams,
  requireCheckinUserId,
  requireHabitForUserWithRetry,
  resolveCheckinWeekStartDay,
} from './checkin-shared'
import { type HabitActionResult, revalidateHabitPaths, runTimedHabitAction } from './utils'

interface RemoveCheckinResultData {
  currentCount: number
  deleted: boolean
}

async function performRemoveCheckin(params: HabitCheckinParams): Promise<RemoveCheckinResultData> {
  const { habitId, dateKey, baseMeta, spans } = params
  const userId = await requireCheckinUserId('action.habits.removeCheckin', baseMeta, spans.timeoutMs)
  const metaWithUser = { ...baseMeta, userId }

  // クエリを並列実行してレイテンシを削減
  const [habit, weekStartDay] = await Promise.all([
    requireHabitForUserWithRetry({
      habitId,
      userId,
      meta: metaWithUser,
      runWithRetry: spans.runWithRetry,
      actionName: 'action.habits.removeCheckin',
    }),
    resolveCheckinWeekStartDay('action.habits.removeCheckin', userId, metaWithUser, spans.runWithRetry),
  ])

  const targetDate = dateKey ?? new Date()
  const deleteMeta = {
    ...metaWithUser,
    period: habit.period,
  }

  const deleted = await spans.runWithDbTimeout(
    'action.habits.removeCheckin.deleteLatestCheckin',
    () => deleteLatestCheckinByHabitAndPeriod(habitId, targetDate, habit.period, weekStartDay),
    deleteMeta
  )

  if (!deleted) {
    // 削除されなかった場合でもcurrentCountを取得して返す
    const { getCurrentCountForPeriod } = await import('@/lib/queries/checkin')
    const currentCount = await spans.runWithDbTimeout(
      'action.habits.removeCheckin.getCurrentCount',
      () => getCurrentCountForPeriod(habitId, targetDate, habit.period, weekStartDay),
      deleteMeta
    )
    return { deleted: false, currentCount }
  }

  // チェックイン削除直後: 同期的にキャッシュ無効化
  await revalidateHabitPaths(userId, { sync: true })

  // アナリティクスキャッシュも無効化（総チェックイン数が変わるため）
  const { invalidateAnalyticsCache } = await import('@/lib/cache/analytics-cache')
  await invalidateAnalyticsCache(userId)

  // 削除後の現在のカウントを取得
  const { getCurrentCountForPeriod } = await import('@/lib/queries/checkin')
  const currentCount = await spans.runWithDbTimeout(
    'action.habits.removeCheckin.getCurrentCount',
    () => getCurrentCountForPeriod(habitId, targetDate, habit.period, weekStartDay),
    deleteMeta
  )

  return { deleted: true, currentCount }
}

export async function removeCheckinAction(
  habitId: string,
  dateKey?: string
): HabitActionResult<RemoveCheckinResultData> {
  return await runTimedHabitAction(
    { habitId, dateKey },
    {
      actionName: 'action.habits.removeCheckin',
      errorDetail: 'チェックインの削除に失敗しました',
      run: async ({ input, baseMeta, spans }) =>
        await performRemoveCheckin({ habitId: input.habitId, dateKey: input.dateKey, baseMeta, spans }),
    }
  )
}
