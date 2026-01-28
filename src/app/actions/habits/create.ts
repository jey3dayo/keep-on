'use server'

import { Result } from '@praha/byethrow'
import { revalidatePath } from 'next/cache'
import { DatabaseError } from '@/lib/errors/habit'
import { type SerializableHabitError, serializeHabitError } from '@/lib/errors/serializable'
import { createHabit as createHabitQuery } from '@/lib/queries/habit'
import { validateHabitInput } from '@/validators/habit'
import { authenticateUser } from './action-utils'

/**
 * 習慣を作成するServer Action
 *
 * @param formData - フォームデータ
 * @returns Result<void, SerializableHabitError>
 */
export async function createHabit(formData: FormData): Result.ResultAsync<void, SerializableHabitError> {
  const userIdResult = await authenticateUser()

  const result = await Result.pipe(
    userIdResult,
    Result.andThen((userId) => validateHabitInput(userId, formData)),
    Result.andThen(async (validInput) => {
      return await Result.try({
        try: async () => await createHabitQuery(validInput),
        catch: (error) => new DatabaseError({ cause: error }),
      })()
    })
  )

  if (Result.isSuccess(result)) {
    revalidatePath('/dashboard')
    return Result.succeed(undefined)
  }

  // エラーをシリアライズ可能な形式に変換
  return Result.fail(serializeHabitError(result.error))
}
