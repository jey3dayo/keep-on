'use server'

import { Result } from '@praha/byethrow'
import { weekStartToDay } from '@/constants/habit'
import { toActionResult } from '@/lib/actions/result'
import { resetDb } from '@/lib/db'
import { AuthorizationError, UnauthorizedError } from '@/lib/errors/habit'
import { createRequestMeta, isTimeoutError, logInfo, logSpan, logSpanOptional, logWarn } from '@/lib/logging'
import { deleteLatestCheckinByHabitAndPeriod } from '@/lib/queries/checkin'
import { getHabitById } from '@/lib/queries/habit'
import { getUserWeekStartById } from '@/lib/queries/user'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import { getCurrentUserId } from '@/lib/user'
import { validateHabitActionInput } from '@/validators/habit-action'
import { type HabitActionResult, revalidateHabitPaths, serializeActionError } from './utils'

type SpanRunner = <T>(name: string, fn: () => Promise<T>, data?: Record<string, unknown>) => Promise<T>

interface RemoveCheckinSpans {
  timeoutMs: number
  dbTimeoutMs: number
  runWithDbTimeout: SpanRunner
  runWithRetry: SpanRunner
  runWithRequestTimeout: SpanRunner
}

type HabitRecord = NonNullable<Awaited<ReturnType<typeof getHabitById>>>
type WeekStartDay = ReturnType<typeof weekStartToDay>

function createRemoveCheckinSpans(timeoutMs: number): RemoveCheckinSpans {
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
  const userId = await logSpanOptional(
    'action.habits.removeCheckin.getCurrentUserId',
    () => getCurrentUserId(),
    baseMeta,
    {
      timeoutMs,
    }
  )

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
  const habit = await runWithRetry('action.habits.removeCheckin.getHabitById', () => getHabitById(habitId), meta)
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
    'action.habits.removeCheckin.getUserWeekStartById',
    () => getUserWeekStartById(userId),
    meta
  )
  return weekStartToDay(weekStart)
}

interface RemoveCheckinResultData {
  deleted: boolean
}

async function performRemoveCheckin(params: {
  habitId: string
  dateKey?: string
  baseMeta: Record<string, unknown>
  spans: RemoveCheckinSpans
}): Promise<RemoveCheckinResultData> {
  const { habitId, dateKey, baseMeta, spans } = params
  const userId = await requireUserId(baseMeta, spans.timeoutMs)
  const metaWithUser = { ...baseMeta, userId }

  // クエリを並列実行してレイテンシを削減
  const [habit, weekStartDay] = await Promise.all([
    requireHabitForUser(habitId, userId, metaWithUser, spans.runWithRetry),
    resolveWeekStartDay(userId, metaWithUser, spans.runWithRetry),
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
    logInfo('action.habits.removeCheckin.skip', deleteMeta)
    return { deleted: false }
  }

  // チェックイン削除直後: 同期的にキャッシュ無効化
  await revalidateHabitPaths(userId, { sync: true })

  // アナリティクスキャッシュも無効化（総チェックイン数が変わるため）
  const { invalidateAnalyticsCache } = await import('@/lib/cache/analytics-cache')
  await invalidateAnalyticsCache(userId)

  return { deleted: true }
}

export async function removeCheckinAction(
  habitId: string,
  dateKey?: string
): HabitActionResult<RemoveCheckinResultData> {
  const requestMeta = createRequestMeta('action.habits.removeCheckin')
  const timeoutMs = getRequestTimeoutMs()
  const spans = createRemoveCheckinSpans(timeoutMs)

  const result = await Result.pipe(
    validateHabitActionInput({ habitId, dateKey }),
    Result.andThen(async (input) => {
      const baseMeta = { ...requestMeta, habitId: input.habitId, dateKey: input.dateKey }
      return await Result.try({
        try: async () => {
          return await spans.runWithRequestTimeout(
            'action.habits.removeCheckin',
            () => performRemoveCheckin({ habitId: input.habitId, dateKey: input.dateKey, baseMeta, spans }),
            baseMeta
          )
        },
        catch: (error) => error,
      })()
    }),
    Result.mapError((error) => serializeActionError(error, 'チェックインの削除に失敗しました'))
  )

  return toActionResult(result)
}
