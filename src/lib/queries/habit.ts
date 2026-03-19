import { and, eq } from 'drizzle-orm'
import { habits } from '@/db/schema'
import { getDb } from '@/lib/db'
import { profileQuery } from '@/lib/queries/profiler'
import type { HabitInput } from '@/validators/habit'

export { getHabitById, getHabitsWithProgress } from './habit-read'

/**
 * 習慣をデータベースに作成
 *
 * @param input - 習慣の入力データ
 * @returns 作成された習慣
 */
export async function createHabit(input: HabitInput) {
  return await profileQuery(
    'query.createHabit',
    async () => {
      const db = getDb()
      const [habit] = await db
        .insert(habits)
        .values({
          userId: input.userId,
          name: input.name,
          icon: input.icon,
          color: input.color,
          period: input.period,
          frequency: input.frequency,
          reminderTime: input.reminderTime,
        })
        .returning()
      return habit
    },
    { userId: input.userId, name: input.name }
  )
}

/**
 * 習慣を更新
 * 所有権確認込みで更新し、存在しない場合はnullを返す
 *
 * @param id - 習慣ID
 * @param userId - ユーザーID
 * @param input - 更新データ
 * @returns 更新された習慣または null
 */
export async function updateHabit(id: string, userId: string, input: Partial<HabitInput>) {
  return await profileQuery(
    'query.updateHabit',
    async () => {
      const db = getDb()
      const [habit] = await db
        .update(habits)
        .set(input)
        .where(and(eq(habits.id, id), eq(habits.userId, userId)))
        .returning()
      return habit ?? null
    },
    { habitId: id, userId }
  )
}

/**
 * 習慣をアーカイブ（論理削除）
 *
 * @param id - 習慣ID
 * @param userId - ユーザーID
 * @returns アーカイブ成功フラグ
 */
export async function archiveHabit(id: string, userId: string) {
  return await profileQuery(
    'query.archiveHabit',
    async () => {
      const db = getDb()
      const result = await db
        .update(habits)
        .set({
          archived: true,
          archivedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(habits.id, id), eq(habits.userId, userId)))
        .returning()
      return result.length > 0
    },
    { habitId: id, userId }
  )
}

/**
 * 習慣を完全削除
 *
 * @param id - 習慣ID
 * @param userId - ユーザーID
 * @returns 削除成功フラグ
 */
export async function deleteHabit(id: string, userId: string) {
  return await profileQuery(
    'query.deleteHabit',
    async () => {
      const db = getDb()
      const result = await db
        .delete(habits)
        .where(and(eq(habits.id, id), eq(habits.userId, userId)))
        .returning()
      return result.length > 0
    },
    { habitId: id, userId }
  )
}

/**
 * アーカイブ済み習慣を取得
 *
 * @param userId - ユーザーID
 * @returns アーカイブ済み習慣の配列
 */
export async function getArchivedHabits(userId: string) {
  return await profileQuery(
    'query.getArchivedHabits',
    async () => {
      const db = getDb()
      return await db
        .select()
        .from(habits)
        .where(and(eq(habits.userId, userId), eq(habits.archived, true)))
    },
    { userId }
  )
}

/**
 * 習慣をアンアーカイブ（復元）
 *
 * @param id - 習慣ID
 * @param userId - ユーザーID
 * @returns 復元成功フラグ
 */
export async function unarchiveHabit(id: string, userId: string) {
  return await profileQuery(
    'query.unarchiveHabit',
    async () => {
      const db = getDb()
      const result = await db
        .update(habits)
        .set({
          archived: false,
          archivedAt: null,
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(habits.id, id), eq(habits.userId, userId)))
        .returning()
      return result.length > 0
    },
    { habitId: id, userId }
  )
}
