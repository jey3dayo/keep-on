import { prisma } from '@/lib/db'
import type { HabitInput } from '@/validators/habit'

/**
 * ユーザーの習慣一覧を取得
 *
 * @param userId - ユーザーID
 * @returns 習慣の配列（作成日降順）
 */
export async function getHabitsByUserId(userId: string) {
  return await prisma.habit.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * 習慣をIDで取得
 *
 * @param id - 習慣ID
 * @returns 習慣または null
 */
export async function getHabitById(id: string) {
  return await prisma.habit.findUnique({
    where: { id },
  })
}

/**
 * 習慣をデータベースに作成
 *
 * @param input - 習慣の入力データ
 * @returns 作成された習慣
 */
export async function createHabit(input: HabitInput) {
  return await prisma.habit.create({
    data: input,
  })
}
