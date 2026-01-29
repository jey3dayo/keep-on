'use server'

import { actionError, actionOk } from '@/lib/actions/result'
import { AuthorizationError, NotFoundError } from '@/lib/errors/habit'
import { serializeHabitError } from '@/lib/errors/serializable'
import { deleteHabit } from '@/lib/queries/habit'
import { type HabitActionResult, requireOwnedHabit, requireUserId, revalidateHabitPaths } from './utils'

/**
 * 習慣を完全削除するServer Action
 *
 * @param habitId - 習慣ID
 * @returns ServerActionResult<void, SerializableHabitError>
 */
export async function deleteHabitAction(habitId: string): HabitActionResult {
  const userIdResult = await requireUserId()

  if (!userIdResult.ok) {
    return userIdResult
  }

  const habitResult = await requireOwnedHabit(habitId, userIdResult.data)

  if (!habitResult.ok) {
    return habitResult
  }

  if (!habitResult.data.archived) {
    return actionError(serializeHabitError(new AuthorizationError({ detail: 'アーカイブされた習慣のみ削除できます' })))
  }

  const deleted = await deleteHabit(habitId, userIdResult.data)

  if (!deleted) {
    return actionError(serializeHabitError(new NotFoundError()))
  }

  revalidateHabitPaths()

  return actionOk()
}
