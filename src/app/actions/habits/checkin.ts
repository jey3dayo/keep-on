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
      habitId,
      userId,
      meta: metaWithUser,
      runWithRetry: spans.runWithRetry,
      actionName: 'action.habits.checkin',
    }),
    resolveCheckinWeekStartDay('action.habits.checkin', userId, metaWithUser, spans.runWithRetry),
  ])

  const targetDate = dateKey ?? new Date()
  const countMeta = {
    ...metaWithUser,
    period: habit.period,
    frequency: habit.frequency,
  }

  const result = await spans.runWithDbTimeout(
    'action.habits.checkin.createCheckin',
    () =>
      createCheckinWithLimit({
        habitId,
        date: targetDate,
        period: habit.period,
        frequency: habit.frequency,
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
    { habitId, dateKey },
    {
      actionName: 'action.habits.checkin',
      errorDetail: 'チェックインの切り替えに失敗しました',
      run: async ({ input, baseMeta, spans }) =>
        await performCheckin({ habitId: input.habitId, dateKey: input.dateKey, baseMeta, spans }),
    }
  )
}
