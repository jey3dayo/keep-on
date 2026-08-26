'use server'

import { Result } from '@praha/byethrow'
import { toActionResult } from '@/lib/actions/result'
import { AuthorizationError, getHabitAuthorizationClientMessage, UnauthorizedError } from '@/lib/errors/habit'
import { deleteAllCheckinsByHabitAndPeriod } from '@/lib/queries/checkin'
import { getHabitById } from '@/lib/queries/habit'
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

          const habit = await getHabitById(input.habitId)

          // habit所有権チェック（クライアントには単一メッセージのみ返す）
          if (!(habit && habit.userId === userId && !habit.archived)) {
            throw new AuthorizationError({ detail: getHabitAuthorizationClientMessage() })
          }

          // 表示文言どおり、ユーザーのタイムゾーンにおける今日のチェックインだけを削除する。
          // daily の期間計算は既存クエリに委譲し、週次・月次の過去日を対象にしない。
          await deleteAllCheckinsByHabitAndPeriod(input.habitId, todayKey, 'daily')

          await revalidateHabitPaths(userId)
        },
      })
    }),
    Result.mapError((error) => serializeActionError(error, '進捗のリセットに失敗しました'))
  )

  return toActionResult(result)
}
