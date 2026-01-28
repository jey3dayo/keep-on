'use server'

import { Result } from '@praha/byethrow'
import { revalidatePath } from 'next/cache'
import { NotFoundError } from '@/lib/errors/habit'
import { serializeHabitError } from '@/lib/errors/serializable'
import { updateHabit } from '@/lib/queries/habit'
import { validateHabitUpdate } from '@/validators/habit'
import { authenticateUser } from './action-utils'

/**
 * 習慣を更新するServer Action
 *
 * @param habitId - 習慣ID
 * @param formData - フォームデータ
 * @returns Result<void, SerializableHabitError>
 */
export async function updateHabitAction(
  habitId: string,
  formData: FormData
): Result.ResultAsync<void, ReturnType<typeof serializeHabitError>> {
  const userIdResult = await authenticateUser()

  if (Result.isSuccess(userIdResult)) {
    const userId = userIdResult.value
    const validationResult = validateHabitUpdate(formData)

    if (Result.isSuccess(validationResult)) {
      const habit = await updateHabit(habitId, userId, validationResult.value)

      if (!habit) {
        return Result.fail(serializeHabitError(new NotFoundError()))
      }

      revalidatePath('/habits')
      revalidatePath('/dashboard')

      return Result.succeed(undefined)
    }
    return Result.fail(serializeHabitError(validationResult.error))
  }
  return Result.fail(serializeHabitError(userIdResult.error))
}
