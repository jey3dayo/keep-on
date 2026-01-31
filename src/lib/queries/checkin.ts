import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import type { Period, WeekStartDay } from '@/constants/habit'
import { checkins, habits } from '@/db/schema'
import { getDb } from '@/lib/db'
import { getPeriodDateRange } from '@/lib/queries/period'
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

interface CreateCheckinWithLimitResult {
  created: boolean
  currentCount: number
  checkin: typeof checkins.$inferSelect | null
}

export async function getCheckinsByUserAndDate(userId: string, date: Date | string) {
  const db = await getDb()
  const dateKey = normalizeDateKey(date)

  const result = await db
    .select()
    .from(checkins)
    .innerJoin(habits, eq(checkins.habitId, habits.id))
    .where(and(eq(habits.userId, userId), eq(checkins.date, dateKey)))

  return result.map((row) => row.Checkin)
}

export async function createCheckin(input: CreateCheckinInput) {
  const db = await getDb()
  const dateKey = normalizeDateKey(input.date)

  const [checkin] = await db
    .insert(checkins)
    .values({
      habitId: input.habitId,
      date: dateKey,
    })
    .returning()

  return checkin ?? null
}

export async function createCheckinWithLimit(
  input: CreateCheckinWithLimitInput
): Promise<CreateCheckinWithLimitResult> {
  const db = await getDb()
  const dateKey = normalizeDateKey(input.date)
  const { startKey, endKey } = getPeriodDateRange(dateKey, input.period, input.weekStartDay ?? 1)

  return await db.transaction(async (tx) => {
    // Serialize per-habit checkins to avoid exceeding frequency under concurrency.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.habitId}))`)

    const result = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(checkins)
      .where(and(eq(checkins.habitId, input.habitId), gte(checkins.date, startKey), lte(checkins.date, endKey)))

    const currentCount = result[0]?.count ?? 0
    if (currentCount >= input.frequency) {
      return { created: false, currentCount, checkin: null }
    }

    const [checkin] = await tx
      .insert(checkins)
      .values({
        habitId: input.habitId,
        date: dateKey,
      })
      .returning()

    return { created: true, currentCount: currentCount + 1, checkin: checkin ?? null }
  })
}

export async function deleteLatestCheckinByHabitAndPeriod(
  habitId: string,
  date: Date | string,
  period: Period,
  weekStartDay: WeekStartDay = 1
) {
  const db = await getDb()
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
}

export async function deleteAllCheckinsByHabitAndPeriod(
  habitId: string,
  date: Date | string,
  period: Period,
  weekStartDay: WeekStartDay = 1
) {
  const db = await getDb()
  const { startKey, endKey } = getPeriodDateRange(date, period, weekStartDay)

  const result = await db
    .delete(checkins)
    .where(and(eq(checkins.habitId, habitId), gte(checkins.date, startKey), lte(checkins.date, endKey)))

  return result
}

export async function getTotalCheckinsByUserId(userId: string): Promise<number> {
  const db = await getDb()
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(checkins)
    .innerJoin(habits, eq(checkins.habitId, habits.id))
    .where(eq(habits.userId, userId))

  return result[0]?.count ?? 0
}

export async function getCheckinCountsByDateRange(userId: string, startDateKey: string, endDateKey: string) {
  const db = await getDb()
  const results = await db
    .select({ date: checkins.date, count: sql<number>`count(*)::int` })
    .from(checkins)
    .innerJoin(habits, eq(checkins.habitId, habits.id))
    .where(and(eq(habits.userId, userId), gte(checkins.date, startDateKey), lte(checkins.date, endDateKey)))
    .groupBy(checkins.date)
    .orderBy(checkins.date)

  return results
}
