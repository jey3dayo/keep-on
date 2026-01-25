import * as v from 'valibot'

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
    emoji: v.pipe(
      v.nullable(v.string()),
      v.transform((val) => (val?.trim() ? val.trim() : null))
    ),
  })
)

export type HabitInputSchemaType = v.InferOutput<typeof HabitInputSchema>
