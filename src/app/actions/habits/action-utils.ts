'use server'

import { Result } from '@praha/byethrow'
import { AuthorizationError, DatabaseError, UnauthorizedError } from '@/lib/errors/habit'
import { getCurrentUserId } from '@/lib/user'

export type SerializableActionError =
  | { name: 'UnauthorizedError'; message: string }
  | { name: 'AuthorizationError'; message: string }
  | { name: 'DatabaseError'; message: string }

/**
 * 認証チェック
 * @returns Result<userId, UnauthorizedError>
 */
export const authenticateUser = async (): Result.ResultAsync<string, UnauthorizedError> => {
  const userId = await getCurrentUserId()
  if (!userId) {
    return Result.fail(new UnauthorizedError())
  }
  return Result.succeed(userId)
}

export const serializeActionError = (error: unknown, databaseDetail: string): SerializableActionError => {
  if (error instanceof UnauthorizedError) {
    return { name: 'UnauthorizedError', message: error.message }
  }

  if (error instanceof AuthorizationError) {
    return { name: 'AuthorizationError', message: error.message }
  }

  const databaseError =
    error instanceof DatabaseError ? error : new DatabaseError({ detail: databaseDetail, cause: error })

  console.error('Database error:', databaseError.cause)
  return { name: 'DatabaseError', message: databaseError.message }
}
