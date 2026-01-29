'use server'

import { archiveHabit } from '@/lib/queries/habit'
import { type HabitActionResult, runHabitMutation } from './utils'

/**
 * 習慣をアーカイブするServer Action
 *
 * @param habitId - 習慣ID
 * @returns ServerActionResult<void, SerializableHabitError>
 */
export async function archiveHabitAction(habitId: string): HabitActionResult {
  return await runHabitMutation(habitId, archiveHabit)
}
