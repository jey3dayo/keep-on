'use server'

import { weekStartToDay } from '@/constants/habit'
import { logInfo } from '@/lib/logging'
import { type CreateCheckinWithLimitResult, createCheckinWithLimit } from '@/lib/queries/checkin'
import { type HabitCheckinParams, requireHabitForUserWithRetry } from './checkin-shared'
import { type HabitActionResult, revalidateHabitPaths, runTimedHabitAction } from './utils'

type CheckinResultData = Pick<CreateCheckinWithLimitResult, 'created' | 'currentCount'>

async function performCheckin(params: HabitCheckinParams): Promise<CheckinResultData> {
  const { habitId, dateKey, baseMeta, opId, spans, userId, weekStartDay } = params
  const metaWithUser = { ...baseMeta, userId }

  const habit = await requireHabitForUserWithRetry({
    actionName: 'action.habits.checkin',
    habitId,
    meta: metaWithUser,
    runWithRetry: spans.runWithRetry,
    userId,
  })

  const countMeta = {
    ...metaWithUser,
    frequency: habit.frequency,
    period: habit.period,
  }

  const result = await spans.runWithDbTimeout(
    'action.habits.checkin.createCheckin',
    () =>
      createCheckinWithLimit({
        date: dateKey,
        frequency: habit.frequency,
        habitId,
        opId,
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

export async function addCheckinAction(
  habitId: string,
  dateKey?: string,
  opId?: string,
  occurredAt?: string,
  timeZone?: string
): HabitActionResult<CheckinResultData> {
  return await runTimedHabitAction(
    { dateKey, habitId, occurredAt, timeZone },
    {
      actionName: 'action.habits.checkin',
      errorDetail: 'チェックインの切り替えに失敗しました',
      run: async ({ input, baseMeta, spans, userId, weekStart }) =>
        await performCheckin({
          baseMeta,
          dateKey: input.dateKey,
          habitId: input.habitId,
          opId,
          spans,
          userId,
          weekStartDay: weekStartToDay(weekStart),
        }),
    }
  )
}
