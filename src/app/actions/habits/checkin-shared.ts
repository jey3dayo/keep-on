import { weekStartToDay } from '@/constants/habit'
import { resetDb } from '@/lib/db'
import { AuthorizationError, getHabitAuthorizationClientMessage, UnauthorizedError } from '@/lib/errors/habit'
import { isTimeoutError, logSpan, logSpanOptional, logWarn } from '@/lib/logging'
import { getHabitById } from '@/lib/queries/habit'
import { getUserWeekStartById } from '@/lib/queries/user'
import { getCurrentUserId } from '@/lib/user'

export type SpanRunner = <T>(name: string, fn: () => Promise<T>, data?: Record<string, unknown>) => Promise<T>

export interface HabitCheckinSpans {
  dbTimeoutMs: number
  runWithDbTimeout: SpanRunner
  runWithRequestTimeout: SpanRunner
  runWithRetry: SpanRunner
  timeoutMs: number
}

export interface HabitCheckinParams {
  baseMeta: Record<string, unknown>
  dateKey: string
  habitId: string
  spans: HabitCheckinSpans
}

export type HabitRecord = NonNullable<Awaited<ReturnType<typeof getHabitById>>>

interface RequireHabitForUserParams {
  actionName: string
  habitId: string
  meta: Record<string, unknown>
  runWithRetry: SpanRunner
  userId: string
}

export function createHabitCheckinSpans(timeoutMs: number): HabitCheckinSpans {
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
    dbTimeoutMs,
    runWithDbTimeout,
    runWithRequestTimeout,
    runWithRetry,
    timeoutMs,
  }
}

export async function requireHabitForUserWithRetry(params: RequireHabitForUserParams): Promise<HabitRecord> {
  const { habitId, userId, meta, runWithRetry, actionName } = params
  const habit = await runWithRetry(`${actionName}.getHabitById`, () => getHabitById(habitId), meta)
  if (!(habit && habit.userId === userId && !habit.archived)) {
    let reason: 'archived' | 'forbidden' | 'not_found' = 'archived'
    if (!habit) {
      reason = 'not_found'
    } else if (habit.userId !== userId) {
      reason = 'forbidden'
    }
    logWarn('habits.authorize:denied', { ...meta, habitId, reason, userId })
    throw new AuthorizationError({ detail: getHabitAuthorizationClientMessage() })
  }
  return habit
}

/**
 * checkin/remove-checkin 共通: userId を取得して認証確認
 * @param actionPrefix - ログスパン名のプレフィックス（例: 'action.habits.checkin'）
 */
export async function requireCheckinUserId(
  actionPrefix: string,
  baseMeta: Record<string, unknown>,
  timeoutMs: number
): Promise<string> {
  const userId = await logSpanOptional(`${actionPrefix}.getCurrentUserId`, () => getCurrentUserId(), baseMeta, {
    timeoutMs,
  })
  if (!userId) {
    throw new UnauthorizedError({ detail: '認証されていません' })
  }
  return userId
}

/**
 * checkin/remove-checkin 共通: 週開始日を解決
 * @param actionPrefix - ログスパン名のプレフィックス（例: 'action.habits.checkin'）
 */
export async function resolveCheckinWeekStartDay(
  actionPrefix: string,
  userId: string,
  meta: Record<string, unknown>,
  runWithRetry: SpanRunner
): Promise<ReturnType<typeof weekStartToDay>> {
  const weekStart = await runWithRetry(`${actionPrefix}.getUserWeekStartById`, () => getUserWeekStartById(userId), meta)
  return weekStartToDay(weekStart)
}
