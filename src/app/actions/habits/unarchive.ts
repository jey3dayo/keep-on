'use server'

import { unarchiveHabit } from '@/lib/queries/habit'
import { type HabitActionResult, runHabitMutation } from './utils'

/**
 * 習慣を復元するServer Action
 *
 * @param habitId - 習慣ID
 * @returns ServerActionResult<void, SerializableHabitError>
 */
export async function unarchiveHabitAction(habitId: string): HabitActionResult {
  return await runHabitMutation(habitId, unarchiveHabit)
}
