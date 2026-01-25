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

export async function toggleCheckinAction(habitId: string, date: Date = new Date()) {
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
    catch: (error) => {
      if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
        return error
      }
      return new DatabaseError('チェックインの切り替えに失敗しました', error)
    },
  })()
}
