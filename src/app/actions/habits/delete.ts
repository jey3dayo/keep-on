'use server'

import { Result } from '@praha/byethrow'
import { AuthorizationError, NotFoundError } from '@/lib/errors/habit'
import { serializeHabitError } from '@/lib/errors/serializable'
import { deleteHabit } from '@/lib/queries/habit'
import { type HabitActionResult, requireOwnedHabit, requireUserId, revalidateHabitPaths } from './utils'

/**
 * 習慣を完全削除するServer Action
 *
 * @param habitId - 習慣ID
 * @returns Result<void, SerializableHabitError>
 */
export async function deleteHabitAction(habitId: string): HabitActionResult {
  const userIdResult = await requireUserId()

  if (!Result.isSuccess(userIdResult)) {
    return Result.fail(userIdResult.error)
  }

  const habitResult = await requireOwnedHabit(habitId, userIdResult.value)

  if (!Result.isSuccess(habitResult)) {
    return Result.fail(habitResult.error)
  }

  if (!habitResult.value.archived) {
    return Result.fail(serializeHabitError(new AuthorizationError({ detail: 'アーカイブされた習慣のみ削除できます' })))
  }

  const deleted = await deleteHabit(habitId, userIdResult.value)

  if (!deleted) {
    return Result.fail(serializeHabitError(new NotFoundError()))
  }

  revalidateHabitPaths()

  return Result.succeed(undefined)
}
