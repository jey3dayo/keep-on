'use server'

import { Result } from '@praha/byethrow'
import { toActionResult } from '@/lib/actions/result'
import { createRequestMeta } from '@/lib/logging'
import { deleteLatestCheckinByHabitAndPeriod } from '@/lib/queries/checkin'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import { validateHabitActionInput } from '@/validators/habit-action'
import {
  createHabitCheckinSpans,
  type HabitCheckinParams,
  requireCheckinUserId,
  requireHabitForUserWithRetry,
  resolveCheckinWeekStartDay,
} from './checkin-shared'
import { type HabitActionResult, revalidateHabitPaths, serializeActionError } from './utils'

interface RemoveCheckinResultData {
  currentCount: number
  deleted: boolean
}

async function performRemoveCheckin(params: HabitCheckinParams): Promise<RemoveCheckinResultData> {
  const { habitId, dateKey, baseMeta, spans } = params
  const userId = await requireCheckinUserId('action.habits.removeCheckin', baseMeta, spans.timeoutMs)
  const metaWithUser = { ...baseMeta, userId }

  // クエリを並列実行してレイテンシを削減
  const [habit, weekStartDay] = await Promise.all([
    requireHabitForUserWithRetry({
      habitId,
      userId,
      meta: metaWithUser,
      runWithRetry: spans.runWithRetry,
      actionName: 'action.habits.removeCheckin',
    }),
    resolveCheckinWeekStartDay('action.habits.removeCheckin', userId, metaWithUser, spans.runWithRetry),
  ])

  const targetDate = dateKey ?? new Date()
  const deleteMeta = {
    ...metaWithUser,
    period: habit.period,
  }

  const deleted = await spans.runWithDbTimeout(
    'action.habits.removeCheckin.deleteLatestCheckin',
    () => deleteLatestCheckinByHabitAndPeriod(habitId, targetDate, habit.period, weekStartDay),
    deleteMeta
  )

  if (!deleted) {
    // 削除されなかった場合でもcurrentCountを取得して返す
    const { getCurrentCountForPeriod } = await import('@/lib/queries/checkin')
    const currentCount = await spans.runWithDbTimeout(
      'action.habits.removeCheckin.getCurrentCount',
      () => getCurrentCountForPeriod(habitId, targetDate, habit.period, weekStartDay),
      deleteMeta
    )
    return { deleted: false, currentCount }
  }

  // チェックイン削除直後: 同期的にキャッシュ無効化
  await revalidateHabitPaths(userId, { sync: true })

  // アナリティクスキャッシュも無効化（総チェックイン数が変わるため）
  const { invalidateAnalyticsCache } = await import('@/lib/cache/analytics-cache')
  await invalidateAnalyticsCache(userId)

  // 削除後の現在のカウントを取得
  const { getCurrentCountForPeriod } = await import('@/lib/queries/checkin')
  const currentCount = await spans.runWithDbTimeout(
    'action.habits.removeCheckin.getCurrentCount',
    () => getCurrentCountForPeriod(habitId, targetDate, habit.period, weekStartDay),
    deleteMeta
  )

  return { deleted: true, currentCount }
}

export async function removeCheckinAction(
  habitId: string,
  dateKey?: string
): HabitActionResult<RemoveCheckinResultData> {
  const requestMeta = createRequestMeta('action.habits.removeCheckin')
  const timeoutMs = getRequestTimeoutMs()
  const spans = createHabitCheckinSpans(timeoutMs)

  const result = await Result.pipe(
    validateHabitActionInput({ habitId, dateKey }),
    Result.andThen(async (input) => {
      const baseMeta = { ...requestMeta, habitId: input.habitId, dateKey: input.dateKey }
      return await Result.try({
        try: async () => {
          return await spans.runWithRequestTimeout(
            'action.habits.removeCheckin',
            () => performRemoveCheckin({ habitId: input.habitId, dateKey: input.dateKey, baseMeta, spans }),
            baseMeta
          )
        },
        catch: (error) => error,
      })
    }),
    Result.mapError((error) => serializeActionError(error, 'チェックインの削除に失敗しました'))
  )

  return toActionResult(result)
}
