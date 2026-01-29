'use server'

import { AuthorizationError } from '@/lib/errors/habit'
import { serializeHabitError } from '@/lib/errors/serializable'
import { deleteHabit } from '@/lib/queries/habit'
import { type HabitActionResult, runHabitMutation } from './utils'

/**
 * 習慣を完全削除するServer Action
 *
 * @param habitId - 習慣ID
 * @returns ServerActionResult<void, SerializableHabitError>
 */
export async function deleteHabitAction(habitId: string): HabitActionResult {
  return await runHabitMutation(habitId, deleteHabit, {
    precondition: (habit) =>
      habit.archived
        ? null
        : serializeHabitError(new AuthorizationError({ detail: 'アーカイブされた習慣のみ削除できます' })),
  })
}
