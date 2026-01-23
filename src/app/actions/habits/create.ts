'use server'

import { Result } from '@praha/byethrow'
import { revalidatePath } from 'next/cache'
import { type HabitError, UnauthorizedError } from '@/lib/errors/habit'
import { saveHabit } from '@/lib/queries/habit'
import { getCurrentUserId } from '@/lib/user'
import { validateHabitInput } from '@/validators/habit'

/**
 * 認証チェック
 * @returns Result<userId, UnauthorizedError>
 */
const authenticateUser = async (): Promise<Result.ResultAsync<string, UnauthorizedError>> => {
  const userId = await getCurrentUserId()
  if (!userId) {
    return Result.fail(new UnauthorizedError())
  }
  return Result.succeed(userId)
}

/**
 * 習慣を作成するServer Action
 *
 * @param formData - フォームデータ
 * @returns Result<void, HabitError>
 */
export async function createHabit(formData: FormData): Promise<Result.ResultAsync<void, HabitError>> {
  const userIdResult = await authenticateUser()

  const result = await Result.pipe(
    userIdResult,
    Result.andThen((userId) => validateHabitInput(userId, formData)),
    Result.andThen((input) => saveHabit(input))
  )

  if (Result.isSuccess(result)) {
    revalidatePath('/dashboard')
  }

  return result
}
