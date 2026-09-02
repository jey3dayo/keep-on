import type { WeekStartDay } from '@/constants/habit'
import { resetDb } from '@/lib/db'
import { AuthorizationError, getHabitAuthorizationClientMessage } from '@/lib/errors/habit'
import { isTimeoutError, logSpan, logWarn } from '@/lib/logging'
import { getHabitById } from '@/lib/queries/habit'

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
  opId?: string
  spans: HabitCheckinSpans
  userId: string
  weekStartDay: WeekStartDay
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
