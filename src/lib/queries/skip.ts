import { and, eq } from 'drizzle-orm'
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
