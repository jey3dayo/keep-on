import { startOfDay, startOfMonth, subDays, subMonths, subWeeks } from 'date-fns'
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { COMPLETION_THRESHOLD, type Period, type WeekStart, type WeekStartDay, weekStartToDay } from '@/constants/habit'
import { checkins, habits } from '@/db/schema'
import { getHabitsCacheSnapshot, setHabitsCache } from '@/lib/cache/habit-cache'
import { getDb } from '@/lib/db'
import { formatError, isDatabaseError, logInfo, logWarn, nowMs } from '@/lib/logging'
import { getPeriodDateRange } from '@/lib/queries/period'
import { profileQuery } from '@/lib/queries/profiler'
import { getUserWeekStart } from '@/lib/queries/user'
import { formatDateKey, normalizeCheckinDate, parseDateKey } from '@/lib/utils/date'
import type { HabitWithProgress } from '@/types/habit'
import type { HabitInput } from '@/validators/habit'

/**
 * ユーザーの習慣一覧を取得
 *
 * @param userId - ユーザーID
 * @returns 習慣の配列（作成日降順）
 */
export async function getHabitsByUserId(userId: string) {
  return await profileQuery(
    'query.getHabitsByUserId',
    async () => {
      const db = await getDb()
      return await db
        .select()
        .from(habits)
        .where(and(eq(habits.userId, userId), eq(habits.archived, false)))
        .orderBy(desc(habits.createdAt))
    },
    { userId }
  )
}

/**
 * 習慣をIDで取得
 *
 * @param id - 習慣ID
 * @returns 習慣または null
 */
export async function getHabitById(id: string) {
  return await profileQuery(
    'query.getHabitById',
    async () => {
      const db = await getDb()
      const [habit] = await db.select().from(habits).where(eq(habits.id, id))
      return habit ?? null
    },
    { habitId: id }
  )
}

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
      const db = await getDb()
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
      const db = await getDb()
      const result = await db
        .update(habits)
        .set({
          archived: true,
          archivedAt: new Date(),
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
      const db = await getDb()
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
      const db = await getDb()
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
      const db = await getDb()
      const result = await db
        .update(habits)
        .set({
          archived: false,
          archivedAt: null,
        })
        .where(and(eq(habits.id, id), eq(habits.userId, userId)))
        .returning()
      return result.length > 0
    },
    { habitId: id, userId }
  )
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
  date: Date | string,
  period: Period,
  weekStartDay: WeekStartDay = 1
): Promise<number> {
  return await profileQuery(
    'query.getCheckinCountForPeriod',
    async () => {
      const db = await getDb()
      const { startKey, endKey } = getPeriodDateRange(date, period, weekStartDay)

      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(checkins)
        .where(and(eq(checkins.habitId, habitId), gte(checkins.date, startKey), lte(checkins.date, endKey)))

      return result[0]?.count ?? 0
    },
    { habitId, period }
  )
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
  period: Period,
  weekStartDay: WeekStartDay = 1
): Promise<number> {
  return await profileQuery(
    'query.calculateStreak',
    async () => {
      const db = await getDb()

      // 習慣情報を取得
      const habit = await getHabitById(habitId)
      if (!habit) {
        return 0
      }

      // 全チェックイン履歴を取得（降順）
      const allCheckins = await db
        .select()
        .from(checkins)
        .where(eq(checkins.habitId, habitId))
        .orderBy(desc(checkins.date))

      if (allCheckins.length === 0) {
        return 0
      }

      let streak = 0
      let currentDate = startOfDay(new Date())

      // 期間ごとにチェックインをグループ化
      const checkinsByPeriod = new Map<string, number>()
      for (const checkin of allCheckins) {
        const periodKey = getPeriodKey(normalizeCheckinDate(checkin.date), period, weekStartDay)
        checkinsByPeriod.set(periodKey, (checkinsByPeriod.get(periodKey) ?? 0) + 1)
      }

      // 現在の期間の達成状況を確認
      const currentPeriodKey = getPeriodKey(currentDate, period, weekStartDay)
      const currentCount = checkinsByPeriod.get(currentPeriodKey) ?? 0

      // 現在の期間が未達成の場合、前の期間から開始
      if (currentCount < habit.frequency) {
        currentDate = getPreviousPeriod(currentDate, habit.period)
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
    },
    { habitId, period }
  )
}

/**
 * 期間のキーを生成（YYYY-MM-DD形式の期間開始日）
 */
function getPeriodKey(date: Date, period: Period, weekStartDay: WeekStartDay = 1): string {
  return getPeriodDateRange(date, period, weekStartDay).startKey
}

/**
 * 前の期間の開始日を取得
 */
function getPreviousPeriod(date: Date, period: Period): Date {
  switch (period) {
    case 'daily':
      return subDays(date, 1)
    case 'weekly':
      return subWeeks(date, 1)
    case 'monthly': {
      // 月のスキップを防ぐため、前月の1日に合わせる
      return subMonths(startOfMonth(date), 1)
    }
    default:
      return date
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
  date: Date | string = new Date(),
  weekStart?: WeekStart
): Promise<HabitWithProgress[]> {
  const totalStart = nowMs()

  // dateKey を計算
  const baseDate = typeof date === 'string' ? parseDateKey(date) : date
  const dateKey = formatDateKey(baseDate)

  // 1. キャッシュから取得を試行（期限切れの場合はフォールバック候補として保持）
  const cacheSnapshot = await getHabitsCacheSnapshot(userId)
  let staleSnapshot: typeof cacheSnapshot | null = null

  if (cacheSnapshot) {
    if (cacheSnapshot.dateKey === dateKey) {
      logInfo('getHabitsWithProgress:cache-hit', { userId, dateKey })
      return cacheSnapshot.habits
    }
    staleSnapshot = cacheSnapshot
    logInfo('habit-cache:stale', { userId, cachedDateKey: cacheSnapshot.dateKey, requestedDateKey: dateKey })
  } else {
    logInfo('habit-cache:miss', { userId })
  }

  // 2. キャッシュミス - DB クエリ実行
  try {
    const dbStart = nowMs()
    const db = await getDb()
    const dbMs = Math.round(nowMs() - dbStart)
    logInfo('getHabitsWithProgress:db-acquisition', { userId, ms: dbMs })

    const queryStart = nowMs()
    const habitList = await getHabitsByUserId(userId)

    if (habitList.length === 0) {
      // キャッシュに空の結果を保存
      await setHabitsCache(userId, dateKey, [])
      return []
    }

    const habitIds = habitList.map((h) => h.id)
    const allCheckinsPromise: Promise<(typeof checkins.$inferSelect)[]> =
      habitIds.length === 0
        ? Promise.resolve([])
        : db
            .select()
            .from(checkins)
            .where(inArray(checkins.habitId, habitIds))
            .orderBy(checkins.habitId, desc(checkins.date), desc(checkins.createdAt))

    // ユーザーの週開始日設定とチェックイン取得を並列化
    const weekStartPromise = weekStart ? Promise.resolve(weekStart) : getUserWeekStart(clerkId)
    const [weekStartStr, allCheckins] = await Promise.all([weekStartPromise, allCheckinsPromise])
    const weekStartDay = weekStartToDay(weekStartStr)

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
      const { start, end } = getPeriodDateRange(baseDate, habit.period, weekStartDay)
      const currentProgress = habitCheckins.filter((c) => {
        const checkinDate = normalizeCheckinDate(c.date)
        return checkinDate >= start && checkinDate <= end
      }).length

      // ストリークを計算
      const streak = calculateStreakFromCheckins(habit, habitCheckins, weekStartDay, baseDate)

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

    // 3. キャッシュに保存
    await setHabitsCache(userId, dateKey, habitsWithProgress)

    const queryMs = Math.round(nowMs() - queryStart)
    const totalMs = Math.round(nowMs() - totalStart)
    logInfo('getHabitsWithProgress:complete', {
      userId,
      dateKey,
      dbMs,
      queryMs,
      totalMs,
      habits: habitsWithProgress.length,
    })

    return habitsWithProgress
  } catch (error) {
    if (staleSnapshot && isDatabaseError(error)) {
      logWarn('getHabitsWithProgress:stale-fallback', {
        userId,
        cachedDateKey: staleSnapshot.dateKey,
        requestedDateKey: dateKey,
        error: formatError(error),
      })
      return staleSnapshot.habits
    }
    throw error
  }
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
  habit: { id: string; frequency: number; period: Period },
  checkins: Array<{ date: Date | string }>,
  weekStartDay: WeekStartDay = 1,
  baseDate: Date = new Date()
): number {
  if (checkins.length === 0) {
    return 0
  }

  let streak = 0
  let currentDate = startOfDay(baseDate)

  // 期間ごとにチェックインをグループ化
  const checkinsByPeriod = new Map<string, number>()
  for (const checkin of checkins) {
    const checkinDate = normalizeCheckinDate(checkin.date)
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
