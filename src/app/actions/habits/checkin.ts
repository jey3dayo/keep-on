'use server'

import { Result } from '@praha/byethrow'
import { revalidatePath } from 'next/cache'
import { createCheckin, deleteCheckinByHabitAndDate, findCheckinByHabitAndDate } from '@/lib/queries/checkin'
import { getHabitById } from '@/lib/queries/habit'
import { getCurrentUserId } from '@/lib/user'

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

class AuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

class DatabaseError extends Error {
  cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'DatabaseError'
    this.cause = cause
  }
}

type SerializableCheckinError =
  | { name: 'AuthenticationError'; message: string }
  | { name: 'AuthorizationError'; message: string }
  | { name: 'DatabaseError'; message: string }

const serializeCheckinError = (error: unknown): SerializableCheckinError => {
  if (error instanceof AuthenticationError) {
    return { name: 'AuthenticationError', message: error.message }
  }

  if (error instanceof AuthorizationError) {
    return { name: 'AuthorizationError', message: error.message }
  }

  const databaseError =
    error instanceof DatabaseError ? error : new DatabaseError('チェックインの切り替えに失敗しました', error)

  console.error('Database error:', databaseError.cause)
  return { name: 'DatabaseError', message: databaseError.message }
}

type ToggleCheckinResult = { success: true; action: 'created' | 'deleted' }

export async function toggleCheckinAction(
  habitId: string,
  date: Date = new Date()
): Result.ResultAsync<ToggleCheckinResult, SerializableCheckinError> {
  return await Result.try({
    try: async () => {
      // 認証チェック
      const userId = await getCurrentUserId()
      if (!userId) {
        throw new AuthenticationError('認証されていません')
      }

      // habit所有権チェック
      const habit = await getHabitById(habitId)
      if (!habit) {
        throw new AuthorizationError('習慣が見つかりません')
      }
      if (habit.userId !== userId) {
        throw new AuthorizationError('この習慣にアクセスする権限がありません')
      }

      const existingCheckin = await findCheckinByHabitAndDate(habitId, date)

      if (existingCheckin) {
        await deleteCheckinByHabitAndDate(habitId, date)
        revalidatePath('/dashboard')
        return { success: true, action: 'deleted' as const }
      }

      await createCheckin({ habitId, date })
      revalidatePath('/dashboard')
      return { success: true, action: 'created' as const }
    },
    catch: (error) => serializeCheckinError(error),
  })()
}
