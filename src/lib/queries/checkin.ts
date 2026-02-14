import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import type { Period, WeekStartDay } from '@/constants/habit'
import { checkins, habits } from '@/db/schema'
import { getDb } from '@/lib/db'
import { getPeriodDateRange } from '@/lib/queries/period'
import { profileQuery } from '@/lib/queries/profiler'
import { normalizeDateKey } from '@/lib/utils/date'

interface CreateCheckinInput {
  habitId: string
  date: Date | string
}

interface CreateCheckinWithLimitInput {
  habitId: string
  date: Date | string
  period: Period
  frequency: number
  weekStartDay?: WeekStartDay
}

function extractErrorMessage(value: unknown): string | null {
  if (typeof value === 'string') {
    return value
  }

  if (value instanceof Error) {
    return value.message
  }

  if (typeof value === 'object' && value !== null) {
    const message = Reflect.get(value, 'message')
    if (typeof message === 'string') {
      return message
    }
  }

  return null
}

function isLegacyUniqueConstraintError(error: unknown): boolean {
  const message = extractErrorMessage(error)
  const cause = typeof error === 'object' && error !== null ? Reflect.get(error, 'cause') : null
  const causeMessage = extractErrorMessage(cause)
  const normalized = [message, causeMessage]
    .filter((entry): entry is string => entry !== null)
    .join(' ')
    .toLowerCase()

  return (
    normalized.includes('unique constraint failed') ||
    normalized.includes('sqlite_constraint_unique') ||
    (normalized.includes('sqlite_constraint') && normalized.includes('unique'))
  )
}

/**
 * チェックイン作成結果
 *
 * @property created - チェックインが作成されたかどうか（頻度上限または旧UNIQUE制約競合で失敗した場合はfalse）
 * @property currentCount - 期間内の現在のチェックイン数
 * @property checkin - 作成されたチェックインレコード（失敗時はnull）
 */
export interface CreateCheckinWithLimitResult {
  created: boolean
  currentCount: number
  checkin: typeof checkins.$inferSelect | null
}

export async function getCheckinsByUserAndDate(userId: string, date: Date | string) {
  return await profileQuery(
    'query.getCheckinsByUserAndDate',
    async () => {
      const db = getDb()
      const dateKey = normalizeDateKey(date)

      const result = await db
        .select()
        .from(checkins)
        .innerJoin(habits, eq(checkins.habitId, habits.id))
        .where(and(eq(habits.userId, userId), eq(checkins.date, dateKey)))

      return result.map((row) => row.Checkin)
    },
    { userId, date: normalizeDateKey(date) }
  )
}

export async function createCheckin(input: CreateCheckinInput) {
  return await profileQuery(
    'query.createCheckin',
    async () => {
      const db = getDb()
      const dateKey = normalizeDateKey(input.date)

      const [checkin] = await db
        .insert(checkins)
        .values({
          habitId: input.habitId,
          date: dateKey,
        })
        .returning()

      return checkin ?? null
    },
    { habitId: input.habitId }
  )
}

export async function getCurrentCountForPeriod(
  habitId: string,
  date: Date | string,
  period: Period,
  weekStartDay: WeekStartDay = 1
): Promise<number> {
  return await profileQuery(
    'query.getCurrentCountForPeriod',
    async () => {
      const db = getDb()
      const dateKey = normalizeDateKey(date)
      const { startKey, endKey } = getPeriodDateRange(dateKey, period, weekStartDay)

      const countResult = await db
        .select({ count: sql<number>`CAST(count(*) AS INTEGER)` })
        .from(checkins)
        .where(and(eq(checkins.habitId, habitId), gte(checkins.date, startKey), lte(checkins.date, endKey)))

      return countResult[0]?.count ?? 0
    },
    { habitId, period }
  )
}

export async function createCheckinWithLimit(
  input: CreateCheckinWithLimitInput
): Promise<CreateCheckinWithLimitResult> {
  return await profileQuery(
    'query.createCheckinWithLimit',
    async () => {
      const db = getDb()
      const dateKey = normalizeDateKey(input.date)
      const { startKey, endKey } = getPeriodDateRange(dateKey, input.period, input.weekStartDay ?? 1)
      return await db.transaction(
        async (tx) => {
          // トランザクション内で頻度上限チェックとINSERTを実行
          const countResult = await tx
            .select({ count: sql<number>`CAST(count(*) AS INTEGER)` })
            .from(checkins)
            .where(and(eq(checkins.habitId, input.habitId), gte(checkins.date, startKey), lte(checkins.date, endKey)))

          const currentCount = countResult[0]?.count ?? 0
          if (currentCount >= input.frequency) {
            return { created: false, currentCount, checkin: null }
          }

          let checkin: typeof checkins.$inferSelect | undefined
          try {
            const inserted = await tx
              .insert(checkins)
              .values({
                habitId: input.habitId,
                date: dateKey,
              })
              .returning()
            checkin = inserted[0]
          } catch (error) {
            // 旧マイグレーション環境で残る UNIQUE(habitId, date) との互換対応
            if (isLegacyUniqueConstraintError(error)) {
              return { created: false, currentCount, checkin: null }
            }
            throw error
          }

          if (!checkin) {
            throw new Error('Failed to create checkin')
          }

          return {
            created: true,
            currentCount: currentCount + 1,
            checkin,
          }
        },
        { behavior: 'immediate' }
      )
    },
    { habitId: input.habitId, period: input.period }
  )
}

export async function deleteLatestCheckinByHabitAndPeriod(
  habitId: string,
  date: Date | string,
  period: Period,
  weekStartDay: WeekStartDay = 1
) {
  return await profileQuery(
    'query.deleteLatestCheckinByHabitAndPeriod',
    async () => {
      const db = getDb()
      const { startKey, endKey } = getPeriodDateRange(date, period, weekStartDay)

      const [latestCheckin] = await db
        .select()
        .from(checkins)
        .where(and(eq(checkins.habitId, habitId), gte(checkins.date, startKey), lte(checkins.date, endKey)))
        .orderBy(desc(checkins.date), desc(checkins.createdAt))
        .limit(1)

      if (!latestCheckin) {
        return false
      }

      await db.delete(checkins).where(eq(checkins.id, latestCheckin.id))
      return true
    },
    { habitId, period }
  )
}

export async function deleteAllCheckinsByHabitAndPeriod(
  habitId: string,
  date: Date | string,
  period: Period,
  weekStartDay: WeekStartDay = 1
) {
  return await profileQuery(
    'query.deleteAllCheckinsByHabitAndPeriod',
    async () => {
      const db = getDb()
      const { startKey, endKey } = getPeriodDateRange(date, period, weekStartDay)

      const result = await db
        .delete(checkins)
        .where(and(eq(checkins.habitId, habitId), gte(checkins.date, startKey), lte(checkins.date, endKey)))

      return result
    },
    { habitId, period }
  )
}

export async function getTotalCheckinsByUserId(userId: string): Promise<number> {
  // KVキャッシュから取得を試行（TTL: 5分）
  const { getTotalCheckinsFromCache, setTotalCheckinsCache } = await import('@/lib/cache/analytics-cache')
  const cached = await getTotalCheckinsFromCache(userId)
  if (cached !== null) {
    return cached
  }

  // キャッシュミス - DB から取得
  return await profileQuery(
    'query.getTotalCheckinsByUserId',
    async () => {
      const db = getDb()
      const result = await db
        .select({ count: sql<number>`CAST(count(*) AS INTEGER)` })
        .from(checkins)
        .innerJoin(habits, eq(checkins.habitId, habits.id))
        .where(eq(habits.userId, userId))

      const total = result[0]?.count ?? 0

      // キャッシュに保存
      await setTotalCheckinsCache(userId, total)

      return total
    },
    { userId }
  )
}

export async function getCheckinCountsByDateRange(userId: string, startDateKey: string, endDateKey: string) {
  return await profileQuery(
    'query.getCheckinCountsByDateRange',
    async () => {
      const db = getDb()
      const results = await db
        .select({ date: checkins.date, count: sql<number>`CAST(count(*) AS INTEGER)` })
        .from(checkins)
        .innerJoin(habits, eq(checkins.habitId, habits.id))
        .where(and(eq(habits.userId, userId), gte(checkins.date, startDateKey), lte(checkins.date, endDateKey)))
        .groupBy(checkins.date)
        .orderBy(checkins.date)

      return results
    },
    { userId, startDateKey, endDateKey }
  )
}
