'use server'

import { Result } from '@praha/byethrow'
import { weekStartToDay } from '@/constants/habit'
import { DEFAULT_REQUEST_TIMEOUT_MS } from '@/constants/request-timeout'
import { toActionResult } from '@/lib/actions/result'
import { AuthorizationError, UnauthorizedError } from '@/lib/errors/habit'
import { createRequestMeta, logInfo, logSpan } from '@/lib/logging'
import { createCheckin } from '@/lib/queries/checkin'
import { getCheckinCountForPeriod, getHabitById } from '@/lib/queries/habit'
import { getUserWeekStartById } from '@/lib/queries/user'
import { getCurrentUserId } from '@/lib/user'
import { type HabitActionResult, revalidateHabitPaths, serializeActionError } from './utils'

export async function addCheckinAction(habitId: string, dateKey?: string): HabitActionResult {
  const requestMeta = createRequestMeta('action.habits.checkin')
  const baseMeta = { ...requestMeta, habitId, dateKey }
  const logSpanWithTimeout = <T>(name: string, fn: () => Promise<T>, data?: Record<string, unknown>) =>
    logSpan(name, fn, data, { timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS })

  const result = await Result.try({
    try: async () => {
      return await logSpanWithTimeout(
        'action.habits.checkin',
        async () => {
          // 認証チェック
          const userId = await logSpanWithTimeout(
            'action.habits.checkin.getCurrentUserId',
            () => getCurrentUserId(),
            baseMeta
          )
          if (!userId) {
            throw new UnauthorizedError({ detail: '認証されていません' })
          }

          const metaWithUser = { ...baseMeta, userId }

          // habit所有権チェック
          const habit = await logSpanWithTimeout(
            'action.habits.checkin.getHabitById',
            () => getHabitById(habitId),
            metaWithUser
          )
          if (!habit) {
            throw new AuthorizationError({ detail: '習慣が見つかりません' })
          }
          if (habit.userId !== userId) {
            throw new AuthorizationError({ detail: 'この習慣にアクセスする権限がありません' })
          }

          const targetDate = dateKey ?? new Date()
          const weekStart = await logSpanWithTimeout(
            'action.habits.checkin.getUserWeekStartById',
            () => getUserWeekStartById(userId),
            metaWithUser
          )
          const weekStartDay = weekStartToDay(weekStart)
          const countMeta = {
            ...metaWithUser,
            period: habit.period,
            frequency: habit.frequency,
          }
          const currentCount = await logSpanWithTimeout(
            'action.habits.checkin.getCheckinCountForPeriod',
            () => getCheckinCountForPeriod(habitId, targetDate, habit.period, weekStartDay),
            countMeta
          )

          // 達成済みの場合は追加せずに終了
          if (currentCount >= habit.frequency) {
            logInfo('action.habits.checkin.skip', { ...countMeta, currentCount })
            return
          }

          await logSpanWithTimeout(
            'action.habits.checkin.createCheckin',
            () => createCheckin({ habitId, date: targetDate }),
            countMeta
          )
          revalidateHabitPaths()
          return
        },
        baseMeta
      )
    },
    catch: (error) => serializeActionError(error, 'チェックインの切り替えに失敗しました'),
  })()

  return toActionResult(result)
}
