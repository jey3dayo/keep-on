import { and, eq } from 'drizzle-orm'
import { checkins, habits } from '@/db/schema'
import { getDb } from '@/lib/db'
import { normalizeDateKey } from '@/lib/utils/date'

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

export async function deleteCheckinByHabitAndDate(habitId: string, date: Date | string) {
  const db = await getDb()
  const dateKey = normalizeDateKey(date)

  await db.delete(checkins).where(and(eq(checkins.habitId, habitId), eq(checkins.date, dateKey)))
}

export async function findCheckinByHabitAndDate(habitId: string, date: Date | string) {
  const db = await getDb()
  const dateKey = normalizeDateKey(date)

  const [checkin] = await db
    .select()
    .from(checkins)
    .where(and(eq(checkins.habitId, habitId), eq(checkins.date, dateKey)))

  return checkin
}
