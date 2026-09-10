'use server'

import { deleteCheckinsByHabitAndDate } from '@/lib/queries/checkin'
import { requireHabitForUserWithRetry } from './checkin-shared'
import { type HabitActionResult, revalidateHabitPaths, runTimedHabitAction } from './utils'

interface ClearCheckinResultData {
  deleted: boolean
  deletedCount: number
}

/**
 * 指定日のチェックインを全件削除する。
 *
 * カレンダーヒートマップの循環トグルで上限（frequency）到達時にタップされた場合に使う。
 * `removeCheckinAction` は期間内の最新1件しか削除できないため、特定日の全削除にはこちらを使う。
 */
export async function clearCheckinAction(habitId: string, dateKey?: string): HabitActionResult<ClearCheckinResultData> {
  return await runTimedHabitAction(
    { dateKey, habitId },
    {
      actionName: 'action.habits.clearCheckin',
      errorDetail: 'チェックインの削除に失敗しました',
      run: async ({ input, baseMeta, spans, userId }) => {
        const metaWithUser = { ...baseMeta, userId }

        await requireHabitForUserWithRetry({
          actionName: 'action.habits.clearCheckin',
          habitId: input.habitId,
          meta: metaWithUser,
          runWithRetry: spans.runWithRetry,
          userId,
        })

        const result = await spans.runWithDbTimeout(
          'action.habits.clearCheckin.deleteCheckinsByHabitAndDate',
          () => deleteCheckinsByHabitAndDate(input.habitId, input.dateKey),
          metaWithUser
        )

        if (!result.deleted) {
          return result
        }

        // チェックイン削除直後: 同期的にキャッシュ無効化
        await revalidateHabitPaths(userId, { sync: true })

        return result
      },
    }
  )
}
