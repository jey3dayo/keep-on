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
    validateHabitActionInput({ dateKey, habitId }),
    Result.andThen(async (input) => {
      return await Result.try({
        catch: (error) => error,
        try: async () => {
          // 認証チェック
          const userId = await getCurrentUserId()
          if (!userId) {
            throw new UnauthorizedError({ detail: '認証されていません' })
          }

          // habit取得とweekStart取得は互いに独立したクエリのため並列実行する
          const [habit, weekStart] = await Promise.all([getHabitById(input.habitId), getUserWeekStartById(userId)])

          // habit所有権チェック
          if (!habit) {
            throw new AuthorizationError({ detail: '習慣が見つかりません' })
          }
          if (habit.userId !== userId) {
            throw new AuthorizationError({ detail: 'この習慣にアクセスする権限がありません' })
          }

          const targetDate = input.dateKey ?? new Date()
          const weekStartDay = weekStartToDay(weekStart)

          // 期間内の全チェックインを削除
          await deleteAllCheckinsByHabitAndPeriod(input.habitId, targetDate, habit.period, weekStartDay)

          // チェックイン削除により総チェックイン数が変わるため、アナリティクスキャッシュを無効化
          const { invalidateAnalyticsCache } = await import('@/lib/cache/analytics-cache')
          await invalidateAnalyticsCache(userId)

          await revalidateHabitPaths(userId)
        },
      })
    }),
    Result.mapError((error) => serializeActionError(error, '進捗のリセットに失敗しました'))
  )

  return toActionResult(result)
}
