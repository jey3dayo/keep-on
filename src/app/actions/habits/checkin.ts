'use server'

import { logInfo } from '@/lib/logging'
import { type CreateCheckinWithLimitResult, createCheckinWithLimit } from '@/lib/queries/checkin'
import {
  type HabitCheckinParams,
  requireCheckinUserId,
  requireHabitForUserWithRetry,
  resolveCheckinWeekStartDay,
} from './checkin-shared'
import { type HabitActionResult, revalidateHabitPaths, runTimedHabitAction } from './utils'

type CheckinResultData = Pick<CreateCheckinWithLimitResult, 'created' | 'currentCount'>

async function performCheckin(params: HabitCheckinParams): Promise<CheckinResultData> {
  const { habitId, dateKey, baseMeta, spans } = params
  const userId = await requireCheckinUserId('action.habits.checkin', baseMeta, spans.timeoutMs)
  const metaWithUser = { ...baseMeta, userId }

  // クエリを並列実行してレイテンシを削減
  const [habit, weekStartDay] = await Promise.all([
    requireHabitForUserWithRetry({
      actionName: 'action.habits.checkin',
      habitId,
      meta: metaWithUser,
      runWithRetry: spans.runWithRetry,
      userId,
    }),
    resolveCheckinWeekStartDay('action.habits.checkin', userId, metaWithUser, spans.runWithRetry),
  ])

  const targetDate = dateKey ?? new Date()
  const countMeta = {
    ...metaWithUser,
    frequency: habit.frequency,
    period: habit.period,
  }

  const result = await spans.runWithDbTimeout(
    'action.habits.checkin.createCheckin',
    () =>
      createCheckinWithLimit({
        date: targetDate,
        frequency: habit.frequency,
        habitId,
        period: habit.period,
        weekStartDay,
      }),
    countMeta
  )

  if (!result.created) {
    logInfo('action.habits.checkin.skip', { ...countMeta, currentCount: result.currentCount })
    return { created: false, currentCount: result.currentCount }
  }

  // チェックイン直後: 同期的にキャッシュ無効化（router.refresh が古いデータを拾わないようにする）
  await revalidateHabitPaths(userId, { sync: true })

  return { created: true, currentCount: result.currentCount }
}

export async function addCheckinAction(habitId: string, dateKey?: string): HabitActionResult<CheckinResultData> {
  return await runTimedHabitAction(
    { dateKey, habitId },
    {
      actionName: 'action.habits.checkin',
      errorDetail: 'チェックインの切り替えに失敗しました',
      run: async ({ input, baseMeta, spans }) =>
        await performCheckin({ baseMeta, dateKey: input.dateKey, habitId: input.habitId, spans }),
    }
  )
}
