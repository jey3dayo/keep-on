'use server'

import { Result } from '@praha/byethrow'
import { weekStartToDay } from '@/constants/habit'
import { toActionResult } from '@/lib/actions/result'
import { AuthorizationError, UnauthorizedError } from '@/lib/errors/habit'
import { deleteAllCheckinsByHabitAndPeriod } from '@/lib/queries/checkin'
import { getHabitById } from '@/lib/queries/habit'
import { getUserWeekStartById } from '@/lib/queries/user'
import { getCurrentUserId } from '@/lib/user'
import { validateHabitActionInput } from '@/validators/habit-action'
import { type HabitActionResult, revalidateHabitPaths, serializeActionError } from './utils'

export async function resetHabitProgressAction(habitId: string, dateKey?: string): HabitActionResult {
  const result = await Result.pipe(
    validateHabitActionInput({ habitId, dateKey }),
    Result.andThen(async (input) => {
      return await Result.try({
        try: async () => {
          // 認証チェック
          const userId = await getCurrentUserId()
          if (!userId) {
            throw new UnauthorizedError({ detail: '認証されていません' })
          }

          // habit所有権チェック
          const habit = await getHabitById(input.habitId)
          if (!habit) {
            throw new AuthorizationError({ detail: '習慣が見つかりません' })
          }
          if (habit.userId !== userId) {
            throw new AuthorizationError({ detail: 'この習慣にアクセスする権限がありません' })
          }

          const targetDate = input.dateKey ?? new Date()
          const weekStart = await getUserWeekStartById(userId)
          const weekStartDay = weekStartToDay(weekStart)

          // 期間内の全チェックインを削除
          await deleteAllCheckinsByHabitAndPeriod(input.habitId, targetDate, habit.period, weekStartDay)

          // Phase 6.2: キャッシュ無効化
          const { invalidateAnalyticsCache } = await import('@/lib/cache/analytics-cache')
          await invalidateAnalyticsCache(userId)

          await revalidateHabitPaths(userId)
          return
        },
        catch: (error) => error,
      })()
    }),
    Result.mapError((error) => serializeActionError(error, '進捗のリセットに失敗しました'))
  )

  return toActionResult(result)
}
