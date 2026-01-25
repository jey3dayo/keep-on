import { and, eq } from 'drizzle-orm'
import { checkins, habits } from '@/db/schema'
import { getDb } from '@/lib/db'

interface CreateCheckinInput {
  habitId: string
  date: Date
}

export async function getCheckinsByUserAndDate(userId: string, date: Date) {
  const db = await getDb()
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  const result = await db
    .select()
    .from(checkins)
    .innerJoin(habits, eq(checkins.habitId, habits.id))
    .where(and(eq(habits.userId, userId), eq(checkins.date, startOfDay)))

  return result.map((row) => row.Checkin)
}

export async function createCheckin(input: CreateCheckinInput) {
  const db = await getDb()
  const startOfDay = new Date(input.date)
  startOfDay.setHours(0, 0, 0, 0)

  const [checkin] = await db
    .insert(checkins)
    .values({
      habitId: input.habitId,
      date: startOfDay,
    })
    .returning()

  return checkin
}

export async function deleteCheckinByHabitAndDate(habitId: string, date: Date) {
  const db = await getDb()
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  await db.delete(checkins).where(and(eq(checkins.habitId, habitId), eq(checkins.date, startOfDay)))
}

export async function findCheckinByHabitAndDate(habitId: string, date: Date) {
  const db = await getDb()
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  const [checkin] = await db
    .select()
    .from(checkins)
    .where(and(eq(checkins.habitId, habitId), eq(checkins.date, startOfDay)))

  return checkin
}
