import { and, desc, eq, gte, lte } from 'drizzle-orm'
import type { Period, WeekStartDay } from '@/constants/habit'
import { checkins, habits } from '@/db/schema'
import { getDb } from '@/lib/db'
import { normalizeDateKey } from '@/lib/utils/date'
import { getPeriodBounds } from './period'

interface CreateCheckinInput {
  habitId: string
  date: Date | string
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

  return checkin
}

export async function deleteLatestCheckinByHabitAndPeriod(
  habitId: string,
  date: Date | string,
  period: Period,
  weekStartDay: WeekStartDay = 1
) {
  const db = await getDb()
  const { startKey, endKey } = getPeriodBounds(date, period, weekStartDay)

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
  const { startKey, endKey } = getPeriodBounds(date, period, weekStartDay)

  const result = await db
    .delete(checkins)
    .where(and(eq(checkins.habitId, habitId), gte(checkins.date, startKey), lte(checkins.date, endKey)))

  return result
}
