import { Result } from '@praha/byethrow'
import type { InferInsertModel } from 'drizzle-orm'
import * as v from 'valibot'
import { ValidationError } from '@/lib/errors/habit'
import { HabitInputSchema } from '@/schemas/habit'

/**
 * 習慣入力データの型定義
 */
export type HabitInput = Omit<InferInsertModel<typeof import('@/db/schema').habits>, 'id' | 'createdAt' | 'updatedAt'>

/**
 * FormDataから習慣入力をバリデーション
 *
 * @param userId - ユーザーID
 * @param formData - フォームデータ
 * @returns Result<HabitInput, ValidationError>
 */
export function validateHabitInput(userId: string, formData: FormData): Result.Result<HabitInput, ValidationError> {
  const name = formData.get('name')
  const icon = formData.get('icon')
  const color = formData.get('color')
  const period = formData.get('period')
  const frequencyRaw = formData.get('frequency')
  const frequency = frequencyRaw ? Number(frequencyRaw) : 1

  const parseResult = v.safeParse(HabitInputSchema, { name, icon, color, period, frequency })

  if (!parseResult.success) {
    const firstIssue = parseResult.issues[0]
    return Result.fail(
      new ValidationError({
        field: firstIssue?.path?.map((p) => p.key).join('.') || 'unknown',
        reason: firstIssue?.message || 'Validation failed',
      })
    )
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
