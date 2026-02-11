import { resetDb } from '@/lib/db'
import { AuthorizationError } from '@/lib/errors/habit'
import { isTimeoutError, logSpan, logWarn } from '@/lib/logging'
import { getHabitById } from '@/lib/queries/habit'

export type SpanRunner = <T>(name: string, fn: () => Promise<T>, data?: Record<string, unknown>) => Promise<T>

export interface HabitCheckinSpans {
  timeoutMs: number
  dbTimeoutMs: number
  runWithDbTimeout: SpanRunner
  runWithRetry: SpanRunner
  runWithRequestTimeout: SpanRunner
}

export interface HabitCheckinParams {
  habitId: string
  dateKey?: string
  baseMeta: Record<string, unknown>
  spans: HabitCheckinSpans
}

export type HabitRecord = NonNullable<Awaited<ReturnType<typeof getHabitById>>>

interface RequireHabitForUserParams {
  habitId: string
  userId: string
  meta: Record<string, unknown>
  runWithRetry: SpanRunner
  actionName: string
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
    timeoutMs,
    dbTimeoutMs,
    runWithDbTimeout,
    runWithRequestTimeout,
    runWithRetry,
  }
}

export async function requireHabitForUserWithRetry(params: RequireHabitForUserParams): Promise<HabitRecord> {
  const { habitId, userId, meta, runWithRetry, actionName } = params
  const habit = await runWithRetry(`${actionName}.getHabitById`, () => getHabitById(habitId), meta)
  if (!habit) {
    throw new AuthorizationError({ detail: '習慣が見つかりません' })
  }
  if (habit.userId !== userId) {
    throw new AuthorizationError({ detail: 'この習慣にアクセスする権限がありません' })
  }
  return habit
}
