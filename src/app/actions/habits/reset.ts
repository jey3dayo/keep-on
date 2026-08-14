'use server'

import { Result } from '@praha/byethrow'
import { weekStartToDay } from '@/constants/habit'
import { toActionResult } from '@/lib/actions/result'
import { AuthorizationError, getHabitAuthorizationClientMessage, UnauthorizedError } from '@/lib/errors/habit'
import { deleteAllCheckinsByHabitAndPeriod } from '@/lib/queries/checkin'
import { getHabitById } from '@/lib/queries/habit'
import { getUserWeekStartById } from '@/lib/queries/user'
import { getServerDateKey } from '@/lib/server/date'
import { getCurrentUserId } from '@/lib/user'
import { validateHabitActionInput } from '@/validators/habit-action'
import { type HabitActionResult, revalidateHabitPaths, serializeActionError } from './utils'

export async function resetHabitProgressAction(habitId: string, dateKey?: string): HabitActionResult {
  const todayKey = await getServerDateKey()
  const result = await Result.pipe(
    validateHabitActionInput({ dateKey, habitId }, todayKey),
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

          // habit所有権チェック（クライアントには単一メッセージのみ返す）
          if (!(habit && habit.userId === userId && !habit.archived)) {
            throw new AuthorizationError({ detail: getHabitAuthorizationClientMessage() })
          }

          const weekStartDay = weekStartToDay(weekStart)

          // 期間内の全チェックインを削除
          await deleteAllCheckinsByHabitAndPeriod(input.habitId, input.dateKey, habit.period, weekStartDay)

          await revalidateHabitPaths(userId)
        },
      })
    }),
    Result.mapError((error) => serializeActionError(error, '進捗のリセットに失敗しました'))
  )

  return toActionResult(result)
}
