'use server'

import { deleteLatestCheckinByHabitAndPeriod } from '@/lib/queries/checkin'
import { type HabitCheckinParams, requireHabitForUserWithRetry, resolveCheckinWeekStartDay } from './checkin-shared'
import { type HabitActionResult, revalidateHabitPaths, runTimedHabitAction } from './utils'

interface RemoveCheckinResultData {
  currentCount: number
  deleted: boolean
}

async function performRemoveCheckin(params: HabitCheckinParams): Promise<RemoveCheckinResultData> {
  const { habitId, dateKey, baseMeta, opId, spans, userId } = params
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

  const deleteMeta = {
    ...metaWithUser,
    period: habit.period,
  }

  const { deleted, currentCount } = await spans.runWithDbTimeout(
    'action.habits.removeCheckin.deleteLatestCheckin',
    () => deleteLatestCheckinByHabitAndPeriod(habitId, dateKey, habit.period, weekStartDay, opId),
    deleteMeta
  )

  if (!deleted) {
    return { currentCount, deleted: false }
  }

  // チェックイン削除直後: 同期的にキャッシュ無効化
  await revalidateHabitPaths(userId, { sync: true })

  return { currentCount, deleted: true }
}

export async function removeCheckinAction(
  habitId: string,
  dateKey?: string,
  opId?: string,
  occurredAt?: string
): HabitActionResult<RemoveCheckinResultData> {
  return await runTimedHabitAction(
    { dateKey, habitId, occurredAt },
    {
      actionName: 'action.habits.removeCheckin',
      errorDetail: 'チェックインの削除に失敗しました',
      run: async ({ input, baseMeta, spans, userId }) =>
        await performRemoveCheckin({ baseMeta, dateKey: input.dateKey, habitId: input.habitId, opId, spans, userId }),
    }
  )
}
