import { Result } from '@praha/byethrow'
import { ValidationError } from '@/lib/errors/habit'
import { HabitInputSchema } from '@/schemas/habit'

/**
 * 習慣入力データの型定義
 */
export interface HabitInput {
  userId: string
  name: string
  emoji: string | null
}

/**
 * FormDataから習慣入力をバリデーション
 *
 * @param userId - ユーザーID
 * @param formData - フォームデータ
 * @returns Result<HabitInput, ValidationError>
 */
export function validateHabitInput(userId: string, formData: FormData): Result.Result<HabitInput, ValidationError> {
  const name = formData.get('name')
  const emoji = formData.get('emoji')

  const parseResult = HabitInputSchema.safeParse({ name, emoji: emoji || null })

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0]
    return Result.fail(
      new ValidationError({
        field: firstIssue?.path.join('.') || 'unknown',
        reason: firstIssue?.message || 'Validation failed',
      })
    )
  }

  return Result.succeed({
    userId,
    name: parseResult.data.name,
    emoji: parseResult.data.emoji || null,
  })
}
