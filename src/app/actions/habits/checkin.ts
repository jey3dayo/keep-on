'use server'

import { Result } from '@praha/byethrow'
import { weekStartToDay } from '@/constants/habit'
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

  return await Result.try({
    try: async () => {
      return await logSpan(
        'action.habits.checkin',
        async () => {
          // 認証チェック
          const userId = await logSpan('action.habits.checkin.getCurrentUserId', () => getCurrentUserId(), baseMeta)
          if (!userId) {
            throw new UnauthorizedError({ detail: '認証されていません' })
          }

          const metaWithUser = { ...baseMeta, userId }

          // habit所有権チェック
          const habit = await logSpan('action.habits.checkin.getHabitById', () => getHabitById(habitId), metaWithUser)
          if (!habit) {
            throw new AuthorizationError({ detail: '習慣が見つかりません' })
          }
          if (habit.userId !== userId) {
            throw new AuthorizationError({ detail: 'この習慣にアクセスする権限がありません' })
          }

          const targetDate = dateKey ?? new Date()
          const weekStart = await logSpan(
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
          const currentCount = await logSpan(
            'action.habits.checkin.getCheckinCountForPeriod',
            () => getCheckinCountForPeriod(habitId, targetDate, habit.period, weekStartDay),
            countMeta
          )

          // 達成済みの場合は追加せずに終了
          if (currentCount >= habit.frequency) {
            logInfo('action.habits.checkin.skip', { ...countMeta, currentCount })
            return
          }

          await logSpan(
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
}
