'use server'

import { Result } from '@praha/byethrow'
import { weekStartToDay } from '@/constants/habit'
import { toActionResult } from '@/lib/actions/result'
import { AuthorizationError, UnauthorizedError } from '@/lib/errors/habit'
import { createCheckin } from '@/lib/queries/checkin'
import { getCheckinCountForPeriod, getHabitById } from '@/lib/queries/habit'
import { getUserWeekStartById } from '@/lib/queries/user'
import { getCurrentUserId } from '@/lib/user'
import { type HabitActionResult, revalidateHabitPaths, serializeActionError } from './utils'

export async function addCheckinAction(habitId: string, dateKey?: string): HabitActionResult {
  const result = await Result.try({
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

      // 達成済みの場合は追加せずに終了
      if (currentCount >= habit.frequency) {
        return
      }

      await createCheckin({ habitId, date: targetDate })
      revalidateHabitPaths()
      return
    },
    catch: (error) => serializeActionError(error, 'チェックインの切り替えに失敗しました'),
  })()

  return toActionResult(result)
}
