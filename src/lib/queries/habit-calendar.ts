import { and, count, eq, gte } from 'drizzle-orm'
import { checkins, habitSkips } from '@/db/schema'
import { getDb } from '@/lib/db'
import { formatDateKey } from '@/lib/utils/date'
import { profileQuery } from './profiler'

export interface HabitCalendarData {
  /** 日付ごとのチェックイン回数 */
  checkinCounts: Map<string, number>
  skipDates: Set<string>
}

/**
 * 習慣の過去6ヶ月分のチェックイン + スキップ日を取得
 *
 * @param habitId - 習慣ID
 * @returns チェックイン日カウントマップ・スキップ日セット
 */
export async function getHabitCalendarData(habitId: string): Promise<HabitCalendarData> {
  return await profileQuery(
    'query.getHabitCalendarData',
    async () => {
      const db = getDb()

      // 6ヶ月前の日付を計算
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const startDateKey = formatDateKey(sixMonthsAgo)

      const [checkinRows, skipRows] = await Promise.all([
        db
          .select({ date: checkins.date, count: count() })
          .from(checkins)
          .where(and(eq(checkins.habitId, habitId), gte(checkins.date, startDateKey)))
          .groupBy(checkins.date),
        db
          .select({ date: habitSkips.date })
          .from(habitSkips)
          .where(and(eq(habitSkips.habitId, habitId), gte(habitSkips.date, startDateKey))),
      ])

      return {
        checkinCounts: new Map(checkinRows.map((r) => [r.date, r.count])),
        skipDates: new Set(skipRows.map((r) => r.date)),
      }
    },
    { habitId }
  )
}
