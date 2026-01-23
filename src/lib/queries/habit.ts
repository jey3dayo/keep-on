import { Result } from '@praha/byethrow'
import { prisma } from '@/lib/db'
import { DatabaseError } from '@/lib/errors/habit'
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
 * 習慣をデータベースに保存
 *
 * @param input - 習慣の入力データ
 * @returns Result<void, DatabaseError>
 */
export const saveHabit = Result.try({
  try: async (input: HabitInput) => {
    await prisma.habit.create({
      data: input,
    })
  },
  catch: (error) => new DatabaseError({ cause: error }),
})
