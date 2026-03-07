import { and, eq, gte } from 'drizzle-orm'
import { checkins, habitSkips } from '@/db/schema'
import { getDb } from '@/lib/db'
import { formatDateKey } from '@/lib/utils/date'
import { profileQuery } from './profiler'

export interface HabitCalendarData {
  checkinDates: Set<string>
  skipDates: Set<string>
}

/**
 * 習慣の過去6ヶ月分のチェックイン + スキップ日を取得
 *
 * @param habitId - 習慣ID
 * @returns チェックイン日セット・スキップ日セット
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
          .select({ date: checkins.date })
          .from(checkins)
          .where(and(eq(checkins.habitId, habitId), gte(checkins.date, startDateKey))),
        db
          .select({ date: habitSkips.date })
          .from(habitSkips)
          .where(and(eq(habitSkips.habitId, habitId), gte(habitSkips.date, startDateKey))),
      ])

      return {
        checkinDates: new Set(checkinRows.map((r) => r.date)),
        skipDates: new Set(skipRows.map((r) => r.date)),
      }
    },
    { habitId }
  )
}
