'use server'

import { Result } from '@praha/byethrow'
import { revalidatePath } from 'next/cache'
import { AuthorizationError, NotFoundError } from '@/lib/errors/habit'
import { serializeHabitError } from '@/lib/errors/serializable'
import { getHabitById, unarchiveHabit } from '@/lib/queries/habit'
import { authenticateUser } from './action-utils'

/**
 * 習慣を復元するServer Action
 *
 * @param habitId - 習慣ID
 * @returns Result<void, SerializableHabitError>
 */
export async function unarchiveHabitAction(
  habitId: string
): Result.ResultAsync<void, ReturnType<typeof serializeHabitError>> {
  const userIdResult = await authenticateUser()

  if (Result.isSuccess(userIdResult)) {
    const userId = userIdResult.value
    const habit = await getHabitById(habitId)

    if (!habit) {
      return Result.fail(serializeHabitError(new NotFoundError()))
    }

    if (habit.userId !== userId) {
      return Result.fail(serializeHabitError(new AuthorizationError()))
    }

    const unarchived = await unarchiveHabit(habitId, userId)

    if (!unarchived) {
      return Result.fail(serializeHabitError(new NotFoundError()))
    }

    revalidatePath('/habits')
    revalidatePath('/dashboard')

    return Result.succeed(undefined)
  }
  return Result.fail(serializeHabitError(userIdResult.error))
}
