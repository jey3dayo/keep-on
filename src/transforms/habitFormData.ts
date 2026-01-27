import {
  DEFAULT_HABIT_COLOR,
  DEFAULT_HABIT_FREQUENCY,
  DEFAULT_HABIT_ICON,
  DEFAULT_HABIT_PERIOD,
  type Period,
} from '@/constants/habit'
import { type HabitInputSchemaType, safeParseHabitInput } from '@/schemas/habit'
import type { HabitWithProgress } from '@/types/habit'

/**
 * Transform層: FormDataから習慣データへの変換
 * UI都合・入力形式都合のみを扱う
 */

export type HabitFormValues = Omit<HabitInputSchemaType, 'period'> & {
  period: Period
}

export function getHabitFormDefaults(initialData?: HabitWithProgress): HabitFormValues {
  if (initialData) {
    return {
      name: initialData.name,
      icon: initialData.icon ?? DEFAULT_HABIT_ICON,
      color: initialData.color ?? DEFAULT_HABIT_COLOR,
      period: initialData.period,
      frequency: initialData.frequency,
    }
  }

  return {
    name: '',
    icon: DEFAULT_HABIT_ICON,
    color: DEFAULT_HABIT_COLOR,
    period: DEFAULT_HABIT_PERIOD,
    frequency: DEFAULT_HABIT_FREQUENCY,
  }
}

export function buildHabitFormData(input: HabitInputSchemaType): FormData {
  const formData = new FormData()
  formData.append('name', input.name)
  if (input.icon?.trim()) {
    formData.append('icon', input.icon)
  }
  if (input.color?.trim()) {
    formData.append('color', input.color)
  }
  formData.append('period', input.period)
  formData.append('frequency', String(input.frequency))
  return formData
}

export function safeBuildHabitFormData(input: unknown): FormData | null {
  const parsed = safeParseHabitInput(input)
  if (!parsed.success) {
    return null
  }
  return buildHabitFormData(parsed.output)
}

/**
 * FormDataから習慣入力データへの変換
 * UIからの生のFormDataをバリデーション可能な形式に変換する
 */
export function transformHabitInput(formData: FormData) {
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

  // frequency はそのまま使用（デイリーでも複数回可能）
  let frequency: number | undefined
  if (typeof parsedFrequency === 'number' && Number.isFinite(parsedFrequency)) {
    frequency = parsedFrequency
  } else {
    frequency = undefined
  }

  return {
    name: getRequiredString('name'),
    icon: getString('icon'),
    color: getString('color'),
    period: periodRaw,
    frequency,
  }
}

/**
 * FormDataから習慣更新データへの変換（部分更新対応）
 * PATCH操作のためのFormDataを部分更新用の形式に変換する
 */
export function transformHabitUpdate(formData: FormData) {
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

  if (frequency !== undefined) {
    input.frequency = frequency
  }

  return input
}
