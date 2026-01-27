'use server'

import { Result } from '@praha/byethrow'
import { revalidatePath } from 'next/cache'
import { AuthorizationError, NotFoundError, UnauthorizedError } from '@/lib/errors/habit'
import { serializeHabitError } from '@/lib/errors/serializable'
import { archiveHabit, getHabitById } from '@/lib/queries/habit'
import { getCurrentUserId } from '@/lib/user'

/**
 * 認証チェック
 * @returns Result<userId, UnauthorizedError>
 */
const authenticateUser = async (): Result.ResultAsync<string, UnauthorizedError> => {
  const userId = await getCurrentUserId()
  if (!userId) {
    return Result.fail(new UnauthorizedError())
  }
  return Result.succeed(userId)
}

/**
 * 習慣をアーカイブするServer Action
 *
 * @param habitId - 習慣ID
 * @returns Result<void, SerializableHabitError>
 */
export async function archiveHabitAction(
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

    const archived = await archiveHabit(habitId, userId)

    if (!archived) {
      return Result.fail(serializeHabitError(new NotFoundError()))
    }

    revalidatePath('/habits')
    revalidatePath('/dashboard')

    return Result.succeed(undefined)
  }
  return Result.fail(serializeHabitError(userIdResult.error))
}
