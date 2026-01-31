import { Result } from '@praha/byethrow'
import { ValidationError } from '@/lib/errors/habit'
import { safeParseDateKey } from '@/schemas/date-key'
import { safeParseHabitId } from '@/schemas/habit'

type ValidationTarget = 'habitId' | 'dateKey'

function toValidationError(
  issue: { message?: string; path?: Array<{ key: string | number }> } | undefined,
  fallback: ValidationTarget
) {
  const field = issue?.path?.map((part) => part.key).join('.') || fallback
  return new ValidationError({
    field,
    reason: issue?.message || 'Validation failed',
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
