import { Result } from '@praha/byethrow'
import type { DayStartHour } from '@/constants/habit'
import { ValidationError } from '@/lib/errors/habit'
import { getDateKeyWithDayStart } from '@/lib/utils/date'
import { safeParseDateKey } from '@/schemas/date-key'
import { safeParseHabitId } from '@/schemas/habit'

type ValidationTarget = 'habitId' | 'dateKey'

/**
 * dateKey 省略時は当日として扱う。365日は過去チェックインのオフライン再送を許容し、
 * +1日はクライアント・サーバー間のクロックスキューを許容するための猶予
 */
const DATE_KEY_WINDOW_DAYS = { future: 1, past: 365 } as const

const MS_PER_DAY = 24 * 60 * 60 * 1000

function dateKeyToUtcMillis(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

export function isDateKeyWithinWindow(dateKey: string, todayKey: string): boolean {
  const diffDays = Math.round((dateKeyToUtcMillis(dateKey) - dateKeyToUtcMillis(todayKey)) / MS_PER_DAY)
  return diffDays >= -DATE_KEY_WINDOW_DAYS.past && diffDays <= DATE_KEY_WINDOW_DAYS.future
}

function toValidationError(issue: unknown, fallback: ValidationTarget) {
  const record = issue && typeof issue === 'object' ? (issue as Record<string, unknown>) : {}
  const message = typeof record.message === 'string' ? record.message : 'Validation failed'
  const path = Array.isArray(record.path) ? record.path : []
  const field =
    path
      .map((part) => (part && typeof part === 'object' ? (part as { key?: unknown }).key : undefined))
      .filter((key): key is string | number => typeof key === 'string' || typeof key === 'number')
      .join('.') || fallback

  return new ValidationError({
    field,
    reason: message,
  })
}

export function validateHabitId(habitId: string): Result.Result<string, ValidationError> {
  const parsed = safeParseHabitId(habitId)
  if (!parsed.success) {
    return Result.fail(toValidationError(parsed.issues[0], 'habitId'))
  }
  return Result.succeed(parsed.output)
}

/**
 * @param input - 検証対象の habitId / dateKey（dateKey 省略可）。`occurredAt`（操作時刻の ISO8601）が
 *   あれば `context` から導出した dateKey を優先採用する（後方互換のため `dateKey` 引数自体は残す）
 * @param todayKey - 呼び出し元が `getServerDateKey()` で解決した基準日（dateKey 省略時のデフォルト値、かつ許容ウィンドウの起点）
 * @param context - `occurredAt` から dateKey を導出するための dayStartHour / timeZone。`occurredAt` を
 *   使わない呼び出し元（reset 等）は省略できる
 */
export function validateHabitActionInput(
  input: { habitId: string; dateKey?: string; occurredAt?: string },
  todayKey: string,
  context?: { dayStartHour: DayStartHour; timeZone?: string }
): Result.Result<{ habitId: string; dateKey: string }, ValidationError> {
  const habitIdResult = validateHabitId(input.habitId)
  if (!Result.isSuccess(habitIdResult)) {
    return habitIdResult
  }

  if (input.occurredAt !== undefined && context) {
    const occurredAtMs = Date.parse(input.occurredAt)
    if (Number.isNaN(occurredAtMs)) {
      return Result.fail(new ValidationError({ field: 'occurredAt', reason: 'Invalid occurredAt' }))
    }

    const derivedDateKey = getDateKeyWithDayStart(new Date(occurredAtMs), context.dayStartHour, context.timeZone)
    if (!isDateKeyWithinWindow(derivedDateKey, todayKey)) {
      return Result.fail(
        new ValidationError({
          field: 'occurredAt',
          reason: 'Date key is outside the allowed window',
        })
      )
    }

    return Result.succeed({ dateKey: derivedDateKey, habitId: habitIdResult.value })
  }

  if (input.dateKey === undefined) {
    return Result.succeed({ dateKey: todayKey, habitId: habitIdResult.value })
  }

  const dateKeyResult = safeParseDateKey(input.dateKey)
  if (!dateKeyResult.success) {
    return Result.fail(toValidationError(dateKeyResult.issues[0], 'dateKey'))
  }

  if (!isDateKeyWithinWindow(dateKeyResult.output, todayKey)) {
    return Result.fail(
      new ValidationError({
        field: 'dateKey',
        reason: 'Date key is outside the allowed window',
      })
    )
  }

  return Result.succeed({ dateKey: dateKeyResult.output, habitId: habitIdResult.value })
}
