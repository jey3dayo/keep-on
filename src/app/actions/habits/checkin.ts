'use server'

import { Result } from '@praha/byethrow'
import { weekStartToDay } from '@/constants/habit'
import { toActionResult } from '@/lib/actions/result'
import { UnauthorizedError } from '@/lib/errors/habit'
import { createRequestMeta, logInfo, logSpanOptional } from '@/lib/logging'
import { type CreateCheckinWithLimitResult, createCheckinWithLimit } from '@/lib/queries/checkin'
import { getUserWeekStartById } from '@/lib/queries/user'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import { getCurrentUserId } from '@/lib/user'
import { validateHabitActionInput } from '@/validators/habit-action'
import { createHabitCheckinSpans, type HabitCheckinParams, requireHabitForUserWithRetry } from './checkin-shared'
import { type HabitActionResult, revalidateHabitPaths, serializeActionError } from './utils'

type WeekStartDay = ReturnType<typeof weekStartToDay>

async function requireUserId(baseMeta: Record<string, unknown>, timeoutMs: number): Promise<string> {
  const userId = await logSpanOptional('action.habits.checkin.getCurrentUserId', () => getCurrentUserId(), baseMeta, {
    timeoutMs,
  })

  if (!userId) {
    throw new UnauthorizedError({ detail: '認証されていません' })
  }

  return userId
}

async function resolveWeekStartDay(
  userId: string,
  meta: Record<string, unknown>,
  runWithRetry: HabitCheckinParams['spans']['runWithRetry']
): Promise<WeekStartDay> {
  const weekStart = await runWithRetry(
    'action.habits.checkin.getUserWeekStartById',
    () => getUserWeekStartById(userId),
    meta
  )
  return weekStartToDay(weekStart)
}

type CheckinResultData = Pick<CreateCheckinWithLimitResult, 'created' | 'currentCount'>

async function performCheckin(params: HabitCheckinParams): Promise<CheckinResultData> {
  const { habitId, dateKey, baseMeta, spans } = params
  const userId = await requireUserId(baseMeta, spans.timeoutMs)
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
    resolveWeekStartDay(userId, metaWithUser, spans.runWithRetry),
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
  const requestMeta = createRequestMeta('action.habits.checkin')
  const timeoutMs = getRequestTimeoutMs()
  const spans = createHabitCheckinSpans(timeoutMs)

  const result = await Result.pipe(
    validateHabitActionInput({ habitId, dateKey }),
    Result.andThen(async (input) => {
      const baseMeta = { ...requestMeta, habitId: input.habitId, dateKey: input.dateKey }
      return await Result.try({
        try: async () => {
          return await spans.runWithRequestTimeout(
            'action.habits.checkin',
            () => performCheckin({ habitId: input.habitId, dateKey: input.dateKey, baseMeta, spans }),
            baseMeta
          )
        },
        catch: (error) => error,
      })()
    }),
    Result.mapError((error) => serializeActionError(error, 'チェックインの切り替えに失敗しました'))
  )

  return toActionResult(result)
}
