import { Result } from '@praha/byethrow'
import type { InferInsertModel } from 'drizzle-orm'
import { ValidationError } from '@/lib/errors/habit'
import { safeParseHabitInput } from '@/schemas/habit'

/**
 * 習慣入力データの型定義
 */
export type HabitInput = Omit<InferInsertModel<typeof import('@/db/schema').habits>, 'id' | 'createdAt' | 'updatedAt'>

/**
 * 習慣更新データの型定義（全てのフィールドをオプションに）
 */
export type HabitUpdateInput = Partial<HabitInput>

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
    const firstIssue = parseResult.issues[0]
    return Result.fail(
      new ValidationError({
        field: firstIssue?.path?.map((p) => p.key).join('.') || 'unknown',
        reason: firstIssue?.message || 'Validation failed',
      })
    )
  }

  return Result.succeed(parseResult.output)
}

/**
 * Transform層: FormDataから習慣入力データへの変換
 * UI都合・入力形式都合のみを扱う
 */
function transformHabitInput(formData: FormData) {
  const getString = (key: string): string | undefined => {
    const v = formData.get(key)
    return typeof v === 'string' ? v : undefined
  }

  const getRequiredString = (key: string): string => {
    const v = getString(key)?.trim()
    return v || ''
  }

  const periodRaw = getString('period')
  const frequencyRaw = getString('frequency')
  const parsedFrequency = frequencyRaw ? Number(frequencyRaw) : undefined
  const isDaily = periodRaw === 'daily' || periodRaw === undefined
  const frequency =
    isDaily && typeof parsedFrequency === 'number' && Number.isFinite(parsedFrequency) ? 1 : parsedFrequency

  return {
    name: getRequiredString('name'),
    icon: getString('icon'),
    color: getString('color'),
    period: periodRaw,
    frequency,
  }
}

/**
 * Transform層: FormDataから習慣更新データへの変換（部分更新対応）
 * UI都合・入力形式都合のみを扱う
 */
function transformHabitUpdate(formData: FormData) {
  const getString = (key: string): string | undefined => {
    const v = formData.get(key)
    return typeof v === 'string' ? v : undefined
  }

  const getOptionalString = (key: string): string | undefined => {
    const v = getString(key)?.trim()
    return v ? v : undefined
  }

  const getOptionalNumber = (key: string): number | undefined => {
    const v = getOptionalString(key)
    if (v === undefined) {
      return undefined
    }
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }

  const period = getOptionalString('period')
  const frequency = getOptionalNumber('frequency')

  // Daily の場合は frequency を 1 に
  const isDaily = period === 'daily'
  const adjustedFrequency = isDaily ? 1 : frequency

  // 部分更新のため、値があるフィールドのみを含める
  const input: Record<string, unknown> = {}
  const name = getOptionalString('name')
  if (name !== undefined) {
    input.name = name
  }

  const icon = getString('icon')
  if (icon !== undefined) {
    input.icon = icon
  }

  const color = getString('color')
  if (color !== undefined) {
    input.color = color
  }

  if (period !== undefined) {
    input.period = period
  }
  if (adjustedFrequency !== undefined) {
    input.frequency = adjustedFrequency
  }

  return input
}
