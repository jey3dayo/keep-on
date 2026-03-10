import { and, eq, gte, inArray, lte } from 'drizzle-orm'
import { habitSkips } from '@/db/schema'
import { getDb } from '@/lib/db'
import { normalizeDateKey } from '@/lib/utils/date'
import { profileQuery } from './profiler'

/**
 * 習慣のスキップを作成
 *
 * @param habitId - 習慣ID
 * @param date - スキップ日付
 * @returns 作成されたスキップ、またはnull（既にスキップ済みの場合）
 */
export async function createSkip(habitId: string, date: Date | string) {
  return await profileQuery(
    'query.createSkip',
    async () => {
      const db = getDb()
      const dateKey = normalizeDateKey(date)

      try {
        const [skip] = await db.insert(habitSkips).values({ habitId, date: dateKey }).returning()
        return skip ?? null
      } catch (error) {
        const errorMessage = String(error)
        if (errorMessage.includes('UNIQUE')) {
          return null
        }
        throw error
      }
    },
    { habitId }
  )
}

/**
 * 習慣のスキップを削除
 *
 * @param habitId - 習慣ID
 * @param date - スキップ日付
 * @returns 削除成功フラグ
 */
export async function deleteSkip(habitId: string, date: Date | string) {
  return await profileQuery(
    'query.deleteSkip',
    async () => {
      const db = getDb()
      const dateKey = normalizeDateKey(date)

      const result = await db
        .delete(habitSkips)
        .where(and(eq(habitSkips.habitId, habitId), eq(habitSkips.date, dateKey)))
        .returning()

      return result.length > 0
    },
    { habitId }
  )
}

/**
 * 複数の習慣IDのスキップを取得
 *
 * @param habitIds - 習慣IDの配列
 * @returns スキップの配列
 */
export async function getSkipsByHabitIds(habitIds: string[]) {
  if (habitIds.length === 0) {
    return []
  }

  return await profileQuery(
    'query.getSkipsByHabitIds',
    async () => {
      const db = getDb()
      return await db.select().from(habitSkips).where(inArray(habitSkips.habitId, habitIds))
    },
    { habitCount: habitIds.length }
  )
}

/**
 * 特定の日付範囲のスキップを取得
 *
 * @param habitId - 習慣ID
 * @param startDateKey - 開始日付 (YYYY-MM-DD)
 * @param endDateKey - 終了日付 (YYYY-MM-DD)
 * @returns スキップの配列
 */
export async function getSkipsByHabitAndDateRange(habitId: string, startDateKey: string, endDateKey: string) {
  return await profileQuery(
    'query.getSkipsByHabitAndDateRange',
    async () => {
      const db = getDb()
      return await db
        .select()
        .from(habitSkips)
        .where(
          and(eq(habitSkips.habitId, habitId), gte(habitSkips.date, startDateKey), lte(habitSkips.date, endDateKey))
        )
    },
    { habitId, startDateKey, endDateKey }
  )
}
