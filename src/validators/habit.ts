import { Result } from '@praha/byethrow'
import type { InferInsertModel } from 'drizzle-orm'
import { ValidationError } from '@/lib/errors/habit'
import { safeParseHabitInput } from '@/schemas/habit'
import { transformHabitInput, transformHabitUpdate } from '@/transforms/habitFormData'

/**
 * 習慣入力データの型定義
 */
export type HabitInput = Omit<InferInsertModel<typeof import('@/db/schema').habits>, 'id' | 'createdAt' | 'updatedAt'>

/**
 * 習慣更新データの型定義（全てのフィールドをオプションに）
 */
type HabitUpdateInput = Partial<HabitInput>
type ParsedHabitInput = Omit<HabitInput, 'userId'>

const toValidationError = (issues: ReturnType<typeof safeParseHabitInput>['issues']) => {
  const firstIssue = issues?.[0]
  return new ValidationError({
    field: firstIssue?.path?.map((p) => String(p.key)).join('.') || 'unknown',
    reason: firstIssue?.message || 'Validation failed',
  })
}

function parseHabitFormData(
  input: Parameters<typeof safeParseHabitInput>[0]
): Result.Result<ParsedHabitInput, ValidationError> {
  const parseResult = safeParseHabitInput(input)

  if (!parseResult.success) {
    return Result.fail(toValidationError(parseResult.issues))
  }

  return Result.succeed(parseResult.output)
}

/**
 * FormDataから習慣入力をバリデーション
 *
 * @param userId - ユーザーID
 * @param formData - フォームデータ
 * @returns Result<HabitInput, ValidationError>
 */
export function validateHabitInput(userId: string, formData: FormData): Result.Result<HabitInput, ValidationError> {
  const parsedResult = parseHabitFormData(transformHabitInput(formData))
  if (!Result.isSuccess(parsedResult)) {
    return parsedResult
  }

  return Result.succeed({
    userId,
    ...parsedResult.value,
  })
}

/**
 * FormDataから習慣更新データをバリデーション
 * 部分更新を許容するため、空のFormDataも許容する
 *
 * @param formData - フォームデータ
 * @returns Result<HabitUpdateInput, ValidationError>
 */
export function validateHabitUpdate(formData: FormData): Result.Result<HabitUpdateInput, ValidationError> {
  return parseHabitFormData(transformHabitUpdate(formData))
}
