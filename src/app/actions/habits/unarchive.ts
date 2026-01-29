'use server'

import { Result } from '@praha/byethrow'
import { NotFoundError } from '@/lib/errors/habit'
import { serializeHabitError } from '@/lib/errors/serializable'
import { unarchiveHabit } from '@/lib/queries/habit'
import { type HabitActionResult, requireOwnedHabit, requireUserId, revalidateHabitPaths } from './utils'

/**
 * 習慣を復元するServer Action
 *
 * @param habitId - 習慣ID
 * @returns Result<void, SerializableHabitError>
 */
export async function unarchiveHabitAction(habitId: string): HabitActionResult {
  const userIdResult = await requireUserId()

  if (!Result.isSuccess(userIdResult)) {
    return Result.fail(userIdResult.error)
  }

  const habitResult = await requireOwnedHabit(habitId, userIdResult.value)

  if (!Result.isSuccess(habitResult)) {
    return Result.fail(habitResult.error)
  }

  const unarchived = await unarchiveHabit(habitId, userIdResult.value)

  if (!unarchived) {
    return Result.fail(serializeHabitError(new NotFoundError()))
  }

  revalidateHabitPaths()

  return Result.succeed(undefined)
}
