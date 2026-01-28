'use server'

import { Result } from '@praha/byethrow'
import { revalidatePath } from 'next/cache'
import { weekStartToDay } from '@/constants/habit'
import { AuthorizationError, DatabaseError, UnauthorizedError } from '@/lib/errors/habit'
import { createCheckin, deleteLatestCheckinByHabitAndPeriod } from '@/lib/queries/checkin'
import { getCheckinCountForPeriod, getHabitById } from '@/lib/queries/habit'
import { getUserWeekStartById } from '@/lib/queries/user'
import { getCurrentUserId } from '@/lib/user'

type SerializableCheckinError =
  | { name: 'UnauthorizedError'; message: string }
  | { name: 'AuthorizationError'; message: string }
  | { name: 'DatabaseError'; message: string }

const serializeCheckinError = (error: unknown): SerializableCheckinError => {
  if (error instanceof UnauthorizedError) {
    return { name: 'UnauthorizedError', message: error.message }
  }

  if (error instanceof AuthorizationError) {
    return { name: 'AuthorizationError', message: error.message }
  }

  const databaseError =
    error instanceof DatabaseError
      ? error
      : new DatabaseError({ detail: 'チェックインの切り替えに失敗しました', cause: error })

  console.error('Database error:', databaseError.cause)
  return { name: 'DatabaseError', message: databaseError.message }
}

export async function toggleCheckinAction(
  habitId: string,
  dateKey?: string
): Result.ResultAsync<void, SerializableCheckinError> {
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
      const currentCount = await getCheckinCountForPeriod(habitId, targetDate, habit.period, weekStartDay)

      if (currentCount >= habit.frequency) {
        await deleteLatestCheckinByHabitAndPeriod(habitId, targetDate, habit.period, weekStartDay)
        revalidatePath('/dashboard')
        revalidatePath('/habits')
        return
      }

      await createCheckin({ habitId, date: targetDate })
      revalidatePath('/dashboard')
      revalidatePath('/habits')
      return
    },
    catch: (error) => serializeCheckinError(error),
  })()
}
