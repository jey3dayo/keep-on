import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { COMPLETION_THRESHOLD, WEEK_END_DAY } from '@/constants/habit'
import { checkins, habits } from '@/db/schema'
import { getDb } from '@/lib/db'
import { getUserWeekStart } from '@/lib/queries/user'
import type { HabitWithProgress } from '@/types/habit'
import type { HabitInput } from '@/validators/habit'

/**
 * 週開始日文字列を数値に変換
 *
 * @param weekStart - "monday" | "sunday"
 * @returns 曜日番号 (0 = Sunday, 1 = Monday)
 */
function weekStartToDay(weekStart: 'monday' | 'sunday'): 0 | 1 {
  return weekStart === 'monday' ? 1 : 0
}

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
 * 期間の開始日時を計算
 *
 * @param date - 基準日
 * @param period - 期間タイプ（daily: その日の00:00:00, weekly: 週の月曜日00:00:00, monthly: 月の1日00:00:00）
 * @param weekStartDay - 週の開始曜日（1 = 月曜日, 0 = 日曜日）
 * @returns 期間の開始日時
 */
function getPeriodStart(date: Date, period: 'daily' | 'weekly' | 'monthly', weekStartDay: 0 | 1 = 1): Date {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)

  switch (period) {
    case 'daily':
      return start
    case 'weekly': {
      // 週の開始日に基づいて計算
      const day = start.getDay()
      const diff = day === WEEK_END_DAY ? -6 : weekStartDay - day
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
 * 期間の終了日時を計算
 *
 * @param date - 基準日
 * @param period - 期間タイプ（daily: その日の23:59:59, weekly: 週の日曜日23:59:59, monthly: 月末23:59:59）
 * @param weekStartDay - 週の開始曜日（1 = 月曜日, 0 = 日曜日）
 * @returns 期間の終了日時
 */
function getPeriodEnd(date: Date, period: 'daily' | 'weekly' | 'monthly', weekStartDay: 0 | 1 = 1): Date {
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  switch (period) {
    case 'daily':
      return end
    case 'weekly': {
      // 週の終了日は週の開始日から6日後
      const weekEndDay = weekStartDay === 1 ? 0 : 6
      const day = end.getDay()
      const diff = day === weekEndDay ? 0 : (weekEndDay - day + 7) % 7
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
 * @param weekStartDay - 週の開始曜日（1 = 月曜日, 0 = 日曜日）
 * @returns チェックイン数
 */
export async function getCheckinCountForPeriod(
  habitId: string,
  date: Date,
  period: 'daily' | 'weekly' | 'monthly',
  weekStartDay: 0 | 1 = 1
): Promise<number> {
  const db = await getDb()
  const start = getPeriodStart(date, period, weekStartDay)
  const end = getPeriodEnd(date, period, weekStartDay)

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
 * @param weekStartDay - 週の開始曜日（1 = 月曜日, 0 = 日曜日）
 * @returns 連続達成日数
 */
export async function calculateStreak(
  habitId: string,
  period: 'daily' | 'weekly' | 'monthly',
  weekStartDay: 0 | 1 = 1
): Promise<number> {
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
    const periodKey = getPeriodKey(checkin.date, period, weekStartDay)
    checkinsByPeriod.set(periodKey, (checkinsByPeriod.get(periodKey) ?? 0) + 1)
  }

  // 現在の期間の達成状況を確認
  const currentPeriodKey = getPeriodKey(currentDate, period, weekStartDay)
  const currentCount = checkinsByPeriod.get(currentPeriodKey) ?? 0

  // 現在の期間が未達成の場合、前の期間から開始
  if (currentCount < habit.frequency) {
    currentDate = getPreviousPeriod(currentDate, period)
  }

  // 過去に向かってストリークをカウント
  while (true) {
    const periodKey = getPeriodKey(currentDate, period, weekStartDay)
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
function getPeriodKey(date: Date, period: 'daily' | 'weekly' | 'monthly', weekStartDay: 0 | 1 = 1): string {
  const start = getPeriodStart(date, period, weekStartDay)
  return formatLocalDate(start)
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
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
    case 'monthly': {
      // 月のスキップを防ぐため、日付を1日に設定してから前月に移動
      prev.setDate(1)
      prev.setMonth(prev.getMonth() - 1)
      return prev
    }
    default:
      return prev
  }
}

/**
 * 進捗情報付きの習慣一覧を取得
 *
 * @param userId - ユーザーID
 * @param clerkId - ClerkのユーザーID（週開始日設定の取得に使用）
 * @param date - 基準日（デフォルト: 今日）
 * @returns 進捗情報付きの習慣配列
 */
export async function getHabitsWithProgress(
  userId: string,
  clerkId: string,
  date: Date = new Date()
): Promise<HabitWithProgress[]> {
  const db = await getDb()
  const habitList = await getHabitsByUserId(userId)

  if (habitList.length === 0) {
    return []
  }

  // ユーザーの週開始日設定を取得
  const weekStartStr = await getUserWeekStart(clerkId)
  const weekStartDay = weekStartToDay(weekStartStr)

  // すべての習慣のチェックインを一括取得（N+1問題の解決）
  const habitIds = habitList.map((h) => h.id)
  const allCheckins = await db
    .select()
    .from(checkins)
    .where(sql`${checkins.habitId} = ANY(${habitIds})`)
    .orderBy(desc(checkins.date))

  // 習慣ごとにチェックインをグループ化
  const checkinsByHabit = new Map<string, typeof allCheckins>()
  for (const checkin of allCheckins) {
    const existing = checkinsByHabit.get(checkin.habitId) ?? []
    existing.push(checkin)
    checkinsByHabit.set(checkin.habitId, existing)
  }

  // 各習慣の進捗とストリークを計算
  const habitsWithProgress = habitList.map((habit) => {
    const habitCheckins = checkinsByHabit.get(habit.id) ?? []

    // 現在の期間の進捗を計算
    const start = getPeriodStart(date, habit.period, weekStartDay)
    const end = getPeriodEnd(date, habit.period, weekStartDay)
    const currentProgress = habitCheckins.filter((c) => {
      const checkinDate = new Date(c.date)
      return checkinDate >= start && checkinDate <= end
    }).length

    // ストリークを計算
    const streak = calculateStreakFromCheckins(habit, habitCheckins, weekStartDay)

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

  return habitsWithProgress
}

/**
 * チェックイン配列からストリークを計算（ヘルパー関数）
 *
 * @param habit - 習慣データ
 * @param checkins - チェックイン配列
 * @param weekStartDay - 週の開始曜日（1 = 月曜日, 0 = 日曜日）
 * @returns ストリーク数
 */
function calculateStreakFromCheckins(
  habit: { id: string; frequency: number; period: 'daily' | 'weekly' | 'monthly' },
  checkins: Array<{ date: Date | string }>,
  weekStartDay: 0 | 1 = 1
): number {
  if (checkins.length === 0) {
    return 0
  }

  let streak = 0
  let currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  // 期間ごとにチェックインをグループ化
  const checkinsByPeriod = new Map<string, number>()
  for (const checkin of checkins) {
    const checkinDate = typeof checkin.date === 'string' ? new Date(checkin.date) : checkin.date
    const periodKey = getPeriodKey(checkinDate, habit.period, weekStartDay)
    checkinsByPeriod.set(periodKey, (checkinsByPeriod.get(periodKey) ?? 0) + 1)
  }

  // 現在の期間の達成状況を確認
  const currentPeriodKey = getPeriodKey(currentDate, habit.period, weekStartDay)
  const currentCount = checkinsByPeriod.get(currentPeriodKey) ?? 0

  // 現在の期間が未達成の場合、前の期間から開始
  if (currentCount < habit.frequency) {
    currentDate = getPreviousPeriod(currentDate, habit.period)
  }

  // 過去に向かってストリークをカウント
  while (true) {
    const periodKey = getPeriodKey(currentDate, habit.period, weekStartDay)
    const count = checkinsByPeriod.get(periodKey) ?? 0

    if (count >= habit.frequency) {
      streak++
      currentDate = getPreviousPeriod(currentDate, habit.period)
    } else {
      break
    }
  }

  return streak
}
