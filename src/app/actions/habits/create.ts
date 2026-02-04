'use server'

import { Result } from '@praha/byethrow'
import { actionError, actionOk, type ServerActionResultAsync } from '@/lib/actions/result'
import { DatabaseError, UnauthorizedError } from '@/lib/errors/habit'
import { type SerializableHabitError, serializeHabitError } from '@/lib/errors/serializable'
import { createHabit as createHabitQuery } from '@/lib/queries/habit'
import { getCurrentUserId } from '@/lib/user'
import { validateHabitInput } from '@/validators/habit'
import { revalidateHabitPaths } from './utils'

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
 * 習慣を作成するServer Action
 *
 * @param formData - フォームデータ
 * @returns ServerActionResult<{id: string}, SerializableHabitError>
 */
export async function createHabit(formData: FormData): ServerActionResultAsync<{ id: string }, SerializableHabitError> {
  const userIdResult = await authenticateUser()

  if (!Result.isSuccess(userIdResult)) {
    return actionError(serializeHabitError(userIdResult.error))
  }

  const userId = userIdResult.value

  const result = await Result.pipe(
    validateHabitInput(userId, formData),
    Result.andThen(async (validInput) => {
      return await Result.try({
        try: async () => await createHabitQuery(validInput),
        catch: (error) => new DatabaseError({ cause: error }),
      })()
    })
  )

  if (Result.isSuccess(result)) {
    await revalidateHabitPaths(userId)
    return actionOk({ id: result.value.id })
  }

  // エラーをシリアライズ可能な形式に変換
  return actionError(serializeHabitError(result.error))
}
