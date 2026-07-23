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
      actionName: 'action.habits.removeCheckin',
      habitId,
      meta: metaWithUser,
      runWithRetry: spans.runWithRetry,
      userId,
    }),
    resolveCheckinWeekStartDay('action.habits.removeCheckin', userId, metaWithUser, spans.runWithRetry),
  ])

  const targetDate = dateKey ?? new Date()
  const deleteMeta = {
    ...metaWithUser,
    period: habit.period,
  }

  const { deleted, currentCount } = await spans.runWithDbTimeout(
    'action.habits.removeCheckin.deleteLatestCheckin',
    () => deleteLatestCheckinByHabitAndPeriod(habitId, targetDate, habit.period, weekStartDay),
    deleteMeta
  )

  if (!deleted) {
    return { currentCount, deleted: false }
  }

  // チェックイン削除直後: 同期的にキャッシュ無効化
  await revalidateHabitPaths(userId, { sync: true })

  // アナリティクスキャッシュも無効化（総チェックイン数が変わるため）
  const { invalidateAnalyticsCache } = await import('@/lib/cache/analytics-cache')
  await invalidateAnalyticsCache(userId)

  return { currentCount, deleted: true }
}

export async function removeCheckinAction(
  habitId: string,
  dateKey?: string
): HabitActionResult<RemoveCheckinResultData> {
  return await runTimedHabitAction(
    { dateKey, habitId },
    {
      actionName: 'action.habits.removeCheckin',
      errorDetail: 'チェックインの削除に失敗しました',
      run: async ({ input, baseMeta, spans }) =>
        await performRemoveCheckin({ baseMeta, dateKey: input.dateKey, habitId: input.habitId, spans }),
    }
  )
}
