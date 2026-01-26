import * as v from 'valibot'

/**
 * 習慣のタスク期間
 */
export const TaskPeriodSchema = v.picklist(['daily', 'weekly', 'monthly'])
export type TaskPeriod = v.InferOutput<typeof TaskPeriodSchema>

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
      v.nullable(v.string()),
      v.transform((val) => (val?.trim() ? val.trim() : null))
    ),
    color: v.pipe(
      v.nullable(v.string()),
      v.transform((val) => (val?.trim() ? val.trim() : null))
    ),
    period: v.optional(TaskPeriodSchema, 'daily'),
    frequency: v.pipe(
      v.number(),
      v.minValue(1, 'Frequency must be at least 1'),
      v.maxValue(100, 'Frequency is too large (max 100)')
    ),
  })
)

export type HabitInputSchemaType = v.InferOutput<typeof HabitInputSchema>
