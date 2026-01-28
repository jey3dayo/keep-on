import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import { and, desc, eq, gte, lte } from 'drizzle-orm'
import type { Period, WeekStartDay } from '@/constants/habit'
import { checkins, habits } from '@/db/schema'
import { getDb } from '@/lib/db'
import { formatDateKey, normalizeDateKey, parseDateKey } from '@/lib/utils/date'

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

function getPeriodStart(date: Date, period: Period, weekStartDay: WeekStartDay = 1): Date {
  switch (period) {
    case 'daily':
      return startOfDay(date)
    case 'weekly':
      return startOfWeek(date, { weekStartsOn: weekStartDay })
    case 'monthly':
      return startOfMonth(date)
    default:
      return startOfDay(date)
  }
}

function getPeriodEnd(date: Date, period: Period, weekStartDay: WeekStartDay = 1): Date {
  switch (period) {
    case 'daily':
      return endOfDay(date)
    case 'weekly':
      return endOfWeek(date, { weekStartsOn: weekStartDay })
    case 'monthly':
      return endOfMonth(date)
    default:
      return endOfDay(date)
  }
}

export async function deleteLatestCheckinByHabitAndPeriod(
  habitId: string,
  date: Date | string,
  period: Period,
  weekStartDay: WeekStartDay = 1
) {
  const db = await getDb()
  const baseDate = typeof date === 'string' ? parseDateKey(date) : date
  const start = getPeriodStart(baseDate, period, weekStartDay)
  const end = getPeriodEnd(baseDate, period, weekStartDay)
  const startKey = formatDateKey(start)
  const endKey = formatDateKey(end)

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
