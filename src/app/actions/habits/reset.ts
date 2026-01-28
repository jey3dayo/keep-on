'use server'

import { Result } from '@praha/byethrow'
import { revalidatePath } from 'next/cache'
import { weekStartToDay } from '@/constants/habit'
import { AuthorizationError, DatabaseError, UnauthorizedError } from '@/lib/errors/habit'
import { deleteAllCheckinsByHabitAndPeriod } from '@/lib/queries/checkin'
import { getHabitById } from '@/lib/queries/habit'
import { getUserWeekStartById } from '@/lib/queries/user'
import { getCurrentUserId } from '@/lib/user'

type SerializableResetError =
  | { name: 'UnauthorizedError'; message: string }
  | { name: 'AuthorizationError'; message: string }
  | { name: 'DatabaseError'; message: string }

const serializeResetError = (error: unknown): SerializableResetError => {
  if (error instanceof UnauthorizedError) {
    return { name: 'UnauthorizedError', message: error.message }
  }

  if (error instanceof AuthorizationError) {
    return { name: 'AuthorizationError', message: error.message }
  }

  const databaseError =
    error instanceof DatabaseError ? error : new DatabaseError({ detail: '進捗のリセットに失敗しました', cause: error })

  console.error('Database error:', databaseError.cause)
  return { name: 'DatabaseError', message: databaseError.message }
}

export async function resetHabitProgressAction(
  habitId: string,
  dateKey?: string
): Result.ResultAsync<void, SerializableResetError> {
  return await Result.try({
    try: async () => {
      // 認証チェック
      const userId = await getCurrentUserId()
      if (!userId) {
        throw new UnauthorizedError({ detail: '認証されていません' })
      }

      // habit所有権チェック
      const habit = await getHabitById(habitId)
      if (!habit) {
        throw new AuthorizationError({ detail: '習慣が見つかりません' })
      }
      if (habit.userId !== userId) {
        throw new AuthorizationError({ detail: 'この習慣にアクセスする権限がありません' })
      }

      const targetDate = dateKey ?? new Date()
      const weekStart = await getUserWeekStartById(userId)
      const weekStartDay = weekStartToDay(weekStart)

      // 期間内の全チェックインを削除
      await deleteAllCheckinsByHabitAndPeriod(habitId, targetDate, habit.period, weekStartDay)

      revalidatePath('/dashboard')
      revalidatePath('/habits')
      return
    },
    catch: (error) => serializeResetError(error),
  })()
}
