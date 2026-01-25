import { desc, eq } from 'drizzle-orm'
import { habits } from '@/db/schema'
import { getDb } from '@/lib/db'
import type { HabitInput } from '@/validators/habit'

/**
 * ユーザーの習慣一覧を取得
 *
 * @param userId - ユーザーID
 * @returns 習慣の配列（作成日降順）
 */
export async function getHabitsByUserId(userId: string) {
  const db = await getDb()
  return await db.select().from(habits).where(eq(habits.userId, userId)).orderBy(desc(habits.createdAt))
}

/**
 * 習慣をIDで取得
 *
 * @param id - 習慣ID
 * @returns 習慣または null
 */
export async function getHabitById(id: string) {
  const db = await getDb()
  const [habit] = await db.select().from(habits).where(eq(habits.id, id))
  return habit ?? null
}

/**
 * 習慣をデータベースに作成
 *
 * @param input - 習慣の入力データ
 * @returns 作成された習慣
 */
export async function createHabit(input: HabitInput) {
  const db = await getDb()
  const [habit] = await db
    .insert(habits)
    .values({
      userId: input.userId,
      name: input.name,
      icon: input.icon,
    })
    .returning()
  return habit
}
