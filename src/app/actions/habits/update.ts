'use server'

import { Result } from '@praha/byethrow'
import { revalidatePath } from 'next/cache'
import { actionError, actionOk, type ServerActionResultAsync } from '@/lib/actions/result'
import { NotFoundError, UnauthorizedError } from '@/lib/errors/habit'
import { serializeHabitError } from '@/lib/errors/serializable'
import { updateHabit } from '@/lib/queries/habit'
import { getCurrentUserId } from '@/lib/user'
import { validateHabitUpdate } from '@/validators/habit'

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
 * 習慣を更新するServer Action
 *
 * @param habitId - 習慣ID
 * @param formData - フォームデータ
 * @returns ServerActionResult<void, SerializableHabitError>
 */
export async function updateHabitAction(
  habitId: string,
  formData: FormData
): ServerActionResultAsync<void, ReturnType<typeof serializeHabitError>> {
  const userIdResult = await authenticateUser()

  if (!Result.isSuccess(userIdResult)) {
    return actionError(serializeHabitError(userIdResult.error))
  }

  const userId = userIdResult.value
  const validationResult = validateHabitUpdate(formData)

  if (!Result.isSuccess(validationResult)) {
    return actionError(serializeHabitError(validationResult.error))
  }

  const habit = await updateHabit(habitId, userId, validationResult.value)

  if (!habit) {
    return actionError(serializeHabitError(new NotFoundError()))
  }

  revalidatePath('/habits')
  revalidatePath('/dashboard')

  return actionOk()
}
