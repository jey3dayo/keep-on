'use server'

import { Result } from '@praha/byethrow'
import { weekStartToDay } from '@/constants/habit'
import { toActionResult } from '@/lib/actions/result'
import { resetDb } from '@/lib/db'
import { AuthorizationError, UnauthorizedError } from '@/lib/errors/habit'
import { createRequestMeta, isTimeoutError, logInfo, logSpan, logSpanOptional, logWarn } from '@/lib/logging'
import { type CreateCheckinWithLimitResult, createCheckinWithLimit } from '@/lib/queries/checkin'
import { getHabitById } from '@/lib/queries/habit'
import { getUserWeekStartById } from '@/lib/queries/user'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import { getCurrentUserId } from '@/lib/user'
import { validateHabitActionInput } from '@/validators/habit-action'
import { type HabitActionResult, revalidateHabitPaths, serializeActionError } from './utils'

type SpanRunner = <T>(name: string, fn: () => Promise<T>, data?: Record<string, unknown>) => Promise<T>

interface CheckinSpans {
  timeoutMs: number
  dbTimeoutMs: number
  runWithDbTimeout: SpanRunner
  runWithRetry: SpanRunner
  runWithRequestTimeout: SpanRunner
}

type HabitRecord = NonNullable<Awaited<ReturnType<typeof getHabitById>>>

type WeekStartDay = ReturnType<typeof weekStartToDay>

function createCheckinSpans(timeoutMs: number): CheckinSpans {
  const dbTimeoutMs = Math.max(3000, Math.min(8000, timeoutMs - 2000))
  const runWithDbTimeout: SpanRunner = (name, fn, data) => logSpan(name, fn, data, { timeoutMs: dbTimeoutMs })
  const runWithRequestTimeout: SpanRunner = (name, fn, data) => logSpan(name, fn, data, { timeoutMs })
  const runWithRetry: SpanRunner = async (name, fn, data) => {
    try {
      return await runWithDbTimeout(name, fn, data)
    } catch (error) {
      if (!isTimeoutError(error)) {
        throw error
      }
      logWarn(`${name}:reset`, data ? { ...data, timeoutMs: dbTimeoutMs } : { timeoutMs: dbTimeoutMs })
      resetDb()
      return await runWithDbTimeout(`${name}.retry`, fn, data)
    }
  }

  return {
    timeoutMs,
    dbTimeoutMs,
    runWithDbTimeout,
    runWithRequestTimeout,
    runWithRetry,
  }
}

async function requireUserId(baseMeta: Record<string, unknown>, timeoutMs: number): Promise<string> {
  const userId = await logSpanOptional('action.habits.checkin.getCurrentUserId', () => getCurrentUserId(), baseMeta, {
    timeoutMs,
  })

  if (!userId) {
    throw new UnauthorizedError({ detail: '認証されていません' })
  }

  return userId
}

async function requireHabitForUser(
  habitId: string,
  userId: string,
  meta: Record<string, unknown>,
  runWithRetry: SpanRunner
): Promise<HabitRecord> {
  const habit = await runWithRetry('action.habits.checkin.getHabitById', () => getHabitById(habitId), meta)
  if (!habit) {
    throw new AuthorizationError({ detail: '習慣が見つかりません' })
  }
  if (habit.userId !== userId) {
    throw new AuthorizationError({ detail: 'この習慣にアクセスする権限がありません' })
  }
  return habit
}

async function resolveWeekStartDay(
  userId: string,
  meta: Record<string, unknown>,
  runWithRetry: SpanRunner
): Promise<WeekStartDay> {
  const weekStart = await runWithRetry(
    'action.habits.checkin.getUserWeekStartById',
    () => getUserWeekStartById(userId),
    meta
  )
  return weekStartToDay(weekStart)
}

type CheckinResultData = Pick<CreateCheckinWithLimitResult, 'created' | 'currentCount'>

async function performCheckin(params: {
  habitId: string
  dateKey?: string
  baseMeta: Record<string, unknown>
  spans: CheckinSpans
}): Promise<CheckinResultData> {
  const { habitId, dateKey, baseMeta, spans } = params
  const userId = await requireUserId(baseMeta, spans.timeoutMs)
  const metaWithUser = { ...baseMeta, userId }

  // クエリを並列実行してレイテンシを削減
  const [habit, weekStartDay] = await Promise.all([
    requireHabitForUser(habitId, userId, metaWithUser, spans.runWithRetry),
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
  const spans = createCheckinSpans(timeoutMs)

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
