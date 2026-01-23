import { z } from 'zod'

/**
 * 習慣入力のバリデーションスキーマ
 */
export const HabitInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long (max 100 characters)'),
  emoji: z.string().nullable().optional(),
})

export type HabitInputSchemaType = z.infer<typeof HabitInputSchema>
