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
export type HabitUpdateInput = Partial<HabitInput>

const toValidationError = (issues: ReturnType<typeof safeParseHabitInput>['issues']) => {
  const firstIssue = issues?.[0]
  return new ValidationError({
    field: firstIssue?.path?.map((p) => String(p.key)).join('.') || 'unknown',
    reason: firstIssue?.message || 'Validation failed',
  })
}

/**
 * FormDataから習慣入力をバリデーション
 *
 * @param userId - ユーザーID
 * @param formData - フォームデータ
 * @returns Result<HabitInput, ValidationError>
 */
export function validateHabitInput(userId: string, formData: FormData): Result.Result<HabitInput, ValidationError> {
  const transformed = transformHabitInput(formData)
  const parseResult = safeParseHabitInput(transformed)

  if (!parseResult.success) {
    return Result.fail(toValidationError(parseResult.issues))
  }

  return Result.succeed({
    userId,
    name: parseResult.output.name,
    icon: parseResult.output.icon,
    color: parseResult.output.color,
    period: parseResult.output.period,
    frequency: parseResult.output.frequency,
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
  const transformed = transformHabitUpdate(formData)
  const parseResult = safeParseHabitInput(transformed)

  if (!parseResult.success) {
    return Result.fail(toValidationError(parseResult.issues))
  }

  return Result.succeed(parseResult.output)
}
