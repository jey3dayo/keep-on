import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { COMPLETION_THRESHOLD, WEEK_END_DAY, WEEK_START_DAY } from '@/constants/habit'
import { checkins, habits } from '@/db/schema'
import { getDb } from '@/lib/db'
import type { HabitWithProgress } from '@/types/habit'
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
      color: input.color,
      period: input.period,
      frequency: input.frequency,
    })
    .returning()
  return habit
}

/**
 * 期間の開始日を計算
 *
 * @param date - 基準日
 * @param period - 期間（daily, weekly, monthly）
 * @returns 期間の開始日
 */
function getPeriodStart(date: Date, period: 'daily' | 'weekly' | 'monthly'): Date {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)

  switch (period) {
    case 'daily':
      return start
    case 'weekly': {
      // 週の開始日は月曜日（WEEK_START_DAY）
      const day = start.getDay()
      const diff = day === WEEK_END_DAY ? -6 : WEEK_START_DAY - day
      start.setDate(start.getDate() + diff)
      return start
    }
    case 'monthly':
      start.setDate(1)
      return start
    default:
      return start
  }
}

/**
 * 期間の終了日を計算
 *
 * @param date - 基準日
 * @param period - 期間（daily, weekly, monthly）
 * @returns 期間の終了日
 */
function getPeriodEnd(date: Date, period: 'daily' | 'weekly' | 'monthly'): Date {
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  switch (period) {
    case 'daily':
      return end
    case 'weekly': {
      // 週の終了日は日曜日（WEEK_END_DAY）
      const day = end.getDay()
      const diff = day === WEEK_END_DAY ? 0 : 7 - day
      end.setDate(end.getDate() + diff)
      return end
    }
    case 'monthly': {
      // 月末日を取得
      const lastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0)
      end.setDate(lastDay.getDate())
      return end
    }
    default:
      return end
  }
}

/**
 * 指定期間のチェックイン数を取得
 *
 * @param habitId - 習慣ID
 * @param date - 基準日
 * @param period - 期間（daily, weekly, monthly）
 * @returns チェックイン数
 */
export async function getCheckinCountForPeriod(
  habitId: string,
  date: Date,
  period: 'daily' | 'weekly' | 'monthly'
): Promise<number> {
  const db = await getDb()
  const start = getPeriodStart(date, period)
  const end = getPeriodEnd(date, period)

  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(checkins)
    .where(and(eq(checkins.habitId, habitId), gte(checkins.date, start), lte(checkins.date, end)))

  return result[0]?.count ?? 0
}

/**
 * ストリーク（連続達成日数）を計算
 *
 * @param habitId - 習慣ID
 * @param period - 期間（daily, weekly, monthly）
 * @returns 連続達成日数
 */
export async function calculateStreak(habitId: string, period: 'daily' | 'weekly' | 'monthly'): Promise<number> {
  const db = await getDb()

  // 習慣情報を取得
  const habit = await getHabitById(habitId)
  if (!habit) {
    return 0
  }

  // 全チェックイン履歴を取得（降順）
  const allCheckins = await db.select().from(checkins).where(eq(checkins.habitId, habitId)).orderBy(desc(checkins.date))

  if (allCheckins.length === 0) {
    return 0
  }

  let streak = 0
  let currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  // 期間ごとにチェックインをグループ化
  const checkinsByPeriod = new Map<string, number>()
  for (const checkin of allCheckins) {
    const periodKey = getPeriodKey(checkin.date, period)
    checkinsByPeriod.set(periodKey, (checkinsByPeriod.get(periodKey) ?? 0) + 1)
  }

  // 現在の期間から過去に向かってストリークをカウント
  while (true) {
    const periodKey = getPeriodKey(currentDate, period)
    const count = checkinsByPeriod.get(periodKey) ?? 0

    if (count >= habit.frequency) {
      streak++
      // 次の期間に移動
      currentDate = getPreviousPeriod(currentDate, period)
    } else {
      break
    }
  }

  return streak
}

/**
 * 期間のキーを生成（YYYY-MM-DD形式の期間開始日）
 */
function getPeriodKey(date: Date, period: 'daily' | 'weekly' | 'monthly'): string {
  const start = getPeriodStart(date, period)
  return start.toISOString().split('T')[0]
}

/**
 * 前の期間の開始日を取得
 */
function getPreviousPeriod(date: Date, period: 'daily' | 'weekly' | 'monthly'): Date {
  const prev = new Date(date)

  switch (period) {
    case 'daily':
      prev.setDate(prev.getDate() - 1)
      return prev
    case 'weekly':
      prev.setDate(prev.getDate() - 7)
      return prev
    case 'monthly':
      prev.setMonth(prev.getMonth() - 1)
      return prev
    default:
      return prev
  }
}

/**
 * 進捗情報付きの習慣一覧を取得
 *
 * @param userId - ユーザーID
 * @param date - 基準日（デフォルト: 今日）
 * @returns 進捗情報付きの習慣配列
 */
export async function getHabitsWithProgress(userId: string, date: Date = new Date()): Promise<HabitWithProgress[]> {
  const habitList = await getHabitsByUserId(userId)

  const habitsWithProgress = await Promise.all(
    habitList.map(async (habit) => {
      const currentProgress = await getCheckinCountForPeriod(habit.id, date, habit.period)
      const streak = await calculateStreak(habit.id, habit.period)
      const completionRate = Math.min(
        COMPLETION_THRESHOLD,
        Math.round((currentProgress / habit.frequency) * COMPLETION_THRESHOLD)
      )

      return {
        ...habit,
        currentProgress,
        streak,
        completionRate,
      }
    })
  )

  return habitsWithProgress
}
