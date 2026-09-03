'use server'

import { Result } from '@praha/byethrow'
import { actionError, toActionResult } from '@/lib/actions/result'
import { AuthorizationError, getHabitAuthorizationClientMessage, UnauthorizedError } from '@/lib/errors/habit'
import { deleteAllCheckinsByHabitAndPeriod } from '@/lib/queries/checkin'
import { getHabitById } from '@/lib/queries/habit'
import { getServerDateKey } from '@/lib/server/date'
import { syncUser } from '@/lib/user'
import { validateHabitActionInput } from '@/validators/habit-action'
import { type HabitActionResult, revalidateHabitPaths, serializeActionError } from './utils'

export async function resetHabitProgressAction(habitId: string, dateKey?: string): HabitActionResult {
  try {
    // 認証チェックを先に行い、その結果の dayStartHour で todayKey を算出する
    // （syncUser はキャッシュ済みなら DB 往復を増やさない）
    const user = await syncUser()
    if (!user) {
      throw new UnauthorizedError({ detail: '認証されていません' })
    }
    const todayKey = await getServerDateKey({ dayStartHour: user.dayStartHour })
    const result = await Result.pipe(
      validateHabitActionInput({ dateKey, habitId }, todayKey),
      Result.andThen(async (input) => {
        return await Result.try({
          catch: (error) => error,
          try: async () => {
            const habit = await getHabitById(input.habitId)

            // habit所有権チェック（クライアントには単一メッセージのみ返す）
            if (!(habit && habit.userId === user.id && !habit.archived)) {
              throw new AuthorizationError({ detail: getHabitAuthorizationClientMessage() })
            }

            // 表示文言どおり、ユーザーのタイムゾーンにおける今日のチェックインだけを削除する。
            // daily の期間計算は既存クエリに委譲し、週次・月次の過去日を対象にしない。
            await deleteAllCheckinsByHabitAndPeriod(input.habitId, todayKey, 'daily')

            await revalidateHabitPaths(user.id)
          },
        })
      }),
      Result.mapError((error) => serializeActionError(error, '進捗のリセットに失敗しました'))
    )

    return toActionResult(result)
  } catch (error) {
    return actionError(serializeActionError(error, '進捗のリセットに失敗しました'))
  }
}
