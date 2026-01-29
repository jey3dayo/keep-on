'use server'

import { actionError, actionOk } from '@/lib/actions/result'
import { NotFoundError } from '@/lib/errors/habit'
import { serializeHabitError } from '@/lib/errors/serializable'
import { archiveHabit } from '@/lib/queries/habit'
import { type HabitActionResult, requireOwnedHabit, requireUserId, revalidateHabitPaths } from './utils'

/**
 * 習慣をアーカイブするServer Action
 *
 * @param habitId - 習慣ID
 * @returns ServerActionResult<void, SerializableHabitError>
 */
export async function archiveHabitAction(habitId: string): HabitActionResult {
  const userIdResult = await requireUserId()

  if (!userIdResult.ok) {
    return userIdResult
  }

  const habitResult = await requireOwnedHabit(habitId, userIdResult.data)

  if (!habitResult.ok) {
    return habitResult
  }

  const archived = await archiveHabit(habitId, userIdResult.data)

  if (!archived) {
    return actionError(serializeHabitError(new NotFoundError()))
  }

  revalidateHabitPaths()

  return actionOk()
}
