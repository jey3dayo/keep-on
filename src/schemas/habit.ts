import * as v from 'valibot'
import { DEFAULT_HABIT_PERIOD, PERIODS } from '@/constants/habit'

/**
 * 習慣のタスク期間
 */
export const PeriodSchema = v.picklist(PERIODS)

/**
 * 習慣入力のバリデーションスキーマ
 */
export const HabitInputSchema = v.pipe(
  v.object({
    name: v.pipe(
      v.string(),
      v.trim(),
      v.minLength(1, 'Name is required'),
      v.maxLength(100, 'Name is too long (max 100 characters)')
    ),
    icon: v.pipe(
      v.nullable(v.optional(v.string())),
      v.transform((val): string | null => (val?.trim() ? val.trim() : null))
    ),
    color: v.pipe(
      v.nullable(v.optional(v.string())),
      v.transform((val): string | null => (val?.trim() ? val.trim() : null))
    ),
    period: v.optional(PeriodSchema, DEFAULT_HABIT_PERIOD),
    frequency: v.pipe(
      v.number(),
      v.minValue(1, 'Frequency must be at least 1'),
      v.maxValue(100, 'Frequency is too large (max 100)')
    ),
  })
)

export type HabitInputSchemaType = v.InferOutput<typeof HabitInputSchema>

export const HabitIdSchema = v.pipe(v.string(), v.trim(), v.minLength(1, 'Habit id is required'))

export type HabitId = v.InferOutput<typeof HabitIdSchema>

export function safeParseHabitId(input: unknown) {
  return v.safeParse(HabitIdSchema, input)
}

export function safeParseHabitInput(input: unknown) {
  return v.safeParse(HabitInputSchema, input)
}
