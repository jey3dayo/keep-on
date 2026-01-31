import { Result } from '@praha/byethrow'
import { ValidationError } from '@/lib/errors/habit'
import { safeParseDateKey } from '@/schemas/date-key'
import { safeParseHabitId } from '@/schemas/habit'

type ValidationTarget = 'habitId' | 'dateKey'

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

export function validateHabitActionInput(input: {
  habitId: string
  dateKey?: string
}): Result.Result<{ habitId: string; dateKey?: string }, ValidationError> {
  const habitIdResult = validateHabitId(input.habitId)
  if (!Result.isSuccess(habitIdResult)) {
    return habitIdResult
  }

  if (input.dateKey == null) {
    return Result.succeed({ habitId: habitIdResult.value })
  }

  const dateKeyResult = safeParseDateKey(input.dateKey)
  if (!dateKeyResult.success) {
    return Result.fail(toValidationError(dateKeyResult.issues[0], 'dateKey'))
  }

  return Result.succeed({ habitId: habitIdResult.value, dateKey: dateKeyResult.output })
}
