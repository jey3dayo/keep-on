import { startOfDay, startOfMonth, subDays, subMonths, subWeeks } from 'date-fns'
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import {
  COMPLETION_THRESHOLD,
  DEFAULT_HABIT_PERIOD,
  type Period,
  type WeekStart,
  type WeekStartDay,
  weekStartToDay,
} from '@/constants/habit'
import { checkins, habitSkips, habits } from '@/db/schema'
import { getHabitsCacheSnapshot, setHabitsCache } from '@/lib/cache/habit-cache'
import { getDb } from '@/lib/db'
import { formatError, isDatabaseError, logInfo, logWarn, nowMs } from '@/lib/logging'
import { getPeriodDateRange } from '@/lib/queries/period'
import { profileQuery } from '@/lib/queries/profiler'
import { getUserWeekStart } from '@/lib/queries/user'
import { formatDateKey, normalizeCheckinDate, parseDateKey } from '@/lib/utils/date'
import type { HabitWithProgress } from '@/types/habit'

const MIN_HABIT_FREQUENCY = 1
const MAX_STREAK_ITERATIONS = 50_000

interface HabitNormalizationOptions {
  context: string
  habitId: string
}

interface HabitNormalizationTarget {
  frequency: number
  habitId: string
  period: unknown
}

interface NormalizedHabitSchedule {
  frequency: number
  period: Period
}

interface HabitSchedule extends NormalizedHabitSchedule {
  id: string
}

function normalizePeriod(period: unknown, options: HabitNormalizationOptions): Period {
  if (period === 'daily' || period === 'weekly' || period === 'monthly') {
    return period
  }

  logWarn('habit.period:invalid', {
    habitId: options.habitId,
    context: options.context,
    period: typeof period === 'string' ? period : String(period),
    fallback: DEFAULT_HABIT_PERIOD,
  })
  return DEFAULT_HABIT_PERIOD
}

function normalizeFrequency(frequency: number, options: HabitNormalizationOptions): number {
  if (!Number.isFinite(frequency) || frequency < MIN_HABIT_FREQUENCY) {
    logWarn('habit.frequency:invalid', {
      habitId: options.habitId,
      context: options.context,
      frequency,
      fallback: MIN_HABIT_FREQUENCY,
    })
    return MIN_HABIT_FREQUENCY
  }

  return Math.max(MIN_HABIT_FREQUENCY, Math.trunc(frequency))
}

function normalizeHabitSchedule(schedule: HabitNormalizationTarget, context: string): NormalizedHabitSchedule {
  const options: HabitNormalizationOptions = {
    habitId: schedule.habitId,
    context,
  }

  return {
    period: normalizePeriod(schedule.period, options),
    frequency: normalizeFrequency(schedule.frequency, options),
  }
}

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
      const db = getDb()
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
      const db = getDb()
      const [habit] = await db.select().from(habits).where(eq(habits.id, id))
      return habit ?? null
    },
    { habitId: id }
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
      const db = getDb()
      const { startKey, endKey } = getPeriodDateRange(date, period, weekStartDay)

      const result = await db
        .select({ count: sql<number>`CAST(count(*) AS INTEGER)` })
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
      const db = getDb()

      const habit = await getHabitById(habitId)
      if (!habit) {
        return 0
      }

      const { frequency: normalizedFrequency, period: normalizedPeriod } = normalizeHabitSchedule(
        {
          frequency: habit.frequency,
          habitId,
          period,
        },
        'calculateStreak'
      )

      const allCheckins = await db
        .select()
        .from(checkins)
        .where(eq(checkins.habitId, habitId))
        .orderBy(desc(checkins.date))

      if (allCheckins.length === 0) {
        return 0
      }

      let streak = 0
      let currentDate = startOfDay(new Date().toISOString())

      const checkinsByPeriod = new Map<string, number>()
      for (const checkin of allCheckins) {
        const periodKey = getPeriodKey(normalizeCheckinDate(checkin.date), normalizedPeriod, weekStartDay)
        checkinsByPeriod.set(periodKey, (checkinsByPeriod.get(periodKey) ?? 0) + 1)
      }

      const currentPeriodKey = getPeriodKey(currentDate, normalizedPeriod, weekStartDay)
      const currentCount = checkinsByPeriod.get(currentPeriodKey) ?? 0

      if (currentCount < normalizedFrequency) {
        currentDate = getPreviousPeriod(currentDate, normalizedPeriod)
      }

      for (let iteration = 0; iteration < MAX_STREAK_ITERATIONS; iteration += 1) {
        const periodKey = getPeriodKey(currentDate, normalizedPeriod, weekStartDay)
        const count = checkinsByPeriod.get(periodKey) ?? 0

        if (count >= normalizedFrequency) {
          streak++
          currentDate = getPreviousPeriod(currentDate, normalizedPeriod)
        } else {
          return streak
        }
      }

      logWarn('habit.streak:iteration-limit', {
        habitId,
        period: normalizedPeriod,
        maxIterations: MAX_STREAK_ITERATIONS,
      })

      return streak
    },
    { habitId, period }
  )
}

function getPeriodKey(date: Date, period: Period, weekStartDay: WeekStartDay = 1): string {
  return getPeriodDateRange(date, period, weekStartDay).startKey
}

function getPreviousPeriod(date: Date, period: Period): Date {
  switch (period) {
    case 'daily':
      return subDays(date, 1)
    case 'weekly':
      return subWeeks(date, 1)
    case 'monthly':
      return subMonths(startOfMonth(date), 1)
    default:
      return subDays(date, 1)
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
  date: Date | string = new Date().toISOString(),
  weekStart?: WeekStart
): Promise<HabitWithProgress[]> {
  const totalStart = nowMs()
  const baseDate = typeof date === 'string' ? parseDateKey(date) : date
  const dateKey = formatDateKey(baseDate)

  const cacheSnapshot = await getHabitsCacheSnapshot(userId)
  let staleSnapshot: typeof cacheSnapshot | null = null

  if (cacheSnapshot) {
    if (!cacheSnapshot.staleAt && cacheSnapshot.dateKey === dateKey) {
      logInfo('getHabitsWithProgress:cache-hit', { userId, dateKey })
      return cacheSnapshot.habits
    }
    staleSnapshot = cacheSnapshot
    logInfo('habit-cache:stale', {
      userId,
      cachedDateKey: cacheSnapshot.dateKey,
      requestedDateKey: dateKey,
      reason: cacheSnapshot.staleAt ? 'invalidated' : 'date-key',
    })
  } else {
    logInfo('habit-cache:miss', { userId })
  }

  try {
    const dbStart = nowMs()
    const db = getDb()
    const dbMs = Math.round(nowMs() - dbStart)
    logInfo('getHabitsWithProgress:db-acquisition', { userId, ms: dbMs })

    const queryStart = nowMs()
    const habitList = await getHabitsByUserId(userId)

    if (habitList.length === 0) {
      await setHabitsCache(userId, dateKey, [])
      return []
    }

    const habitIds = habitList.map((habit) => habit.id)
    const allCheckinsPromise: Promise<(typeof checkins.$inferSelect)[]> =
      habitIds.length === 0
        ? Promise.resolve([])
        : db
            .select()
            .from(checkins)
            .where(inArray(checkins.habitId, habitIds))
            .orderBy(checkins.habitId, desc(checkins.date), desc(checkins.createdAt))

    const streakLimitDate = new Date(baseDate)
    streakLimitDate.setFullYear(streakLimitDate.getFullYear() - 1)
    const streakLimitDateKey = formatDateKey(streakLimitDate)

    const allSkipsPromise: Promise<(typeof habitSkips.$inferSelect)[]> =
      habitIds.length === 0
        ? Promise.resolve([])
        : db
            .select()
            .from(habitSkips)
            .where(and(inArray(habitSkips.habitId, habitIds), gte(habitSkips.date, streakLimitDateKey)))

    const weekStartPromise = weekStart ? Promise.resolve(weekStart) : getUserWeekStart(clerkId)
    const [weekStartStr, allCheckins, allSkips] = await Promise.all([
      weekStartPromise,
      allCheckinsPromise,
      allSkipsPromise,
    ])
    const weekStartDay = weekStartToDay(weekStartStr)

    const checkinsByHabit = new Map<string, typeof allCheckins>()
    for (const checkin of allCheckins) {
      const existing = checkinsByHabit.get(checkin.habitId) ?? []
      existing.push(checkin)
      checkinsByHabit.set(checkin.habitId, existing)
    }

    const skipsByHabit = new Map<string, typeof allSkips>()
    for (const skip of allSkips) {
      const existing = skipsByHabit.get(skip.habitId) ?? []
      existing.push(skip)
      skipsByHabit.set(skip.habitId, existing)
    }

    const habitsWithProgress = habitList.map((habit) => {
      const { frequency: normalizedFrequency, period: normalizedPeriod } = normalizeHabitSchedule(
        {
          frequency: habit.frequency,
          habitId: habit.id,
          period: habit.period,
        },
        'getHabitsWithProgress'
      )
      const habitCheckins = checkinsByHabit.get(habit.id) ?? []
      const habitSkipList = skipsByHabit.get(habit.id) ?? []

      const { start, end } = getPeriodDateRange(baseDate, normalizedPeriod, weekStartDay)
      const currentProgress = habitCheckins.filter((checkin) => {
        const checkinDate = normalizeCheckinDate(checkin.date)
        return checkinDate >= start && checkinDate <= end
      }).length

      const skippedToday = habitSkipList.some((skip) => skip.date === dateKey)

      const streak = calculateStreakFromCheckins(
        {
          id: habit.id,
          period: normalizedPeriod,
          frequency: normalizedFrequency,
        },
        habitCheckins,
        weekStartDay,
        baseDate,
        habitSkipList
      )

      const completionRate = Math.min(
        COMPLETION_THRESHOLD,
        Math.round((currentProgress / normalizedFrequency) * COMPLETION_THRESHOLD)
      )

      return {
        ...habit,
        period: normalizedPeriod,
        frequency: normalizedFrequency,
        currentProgress,
        skippedToday,
        streak,
        completionRate,
      }
    })

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

function calculateStreakFromCheckins(
  habit: HabitSchedule,
  checkins: Array<{ date: Date | string }>,
  weekStartDay: WeekStartDay = 1,
  baseDate: Date | string = new Date(),
  skips: Array<{ date: Date | string }> = []
): number {
  if (checkins.length === 0 && skips.length === 0) {
    return 0
  }

  const { frequency: normalizedFrequency, period: normalizedPeriod } = normalizeHabitSchedule(
    {
      frequency: habit.frequency,
      habitId: habit.id,
      period: habit.period,
    },
    'calculateStreakFromCheckins'
  )

  let streak = 0
  let currentDate = startOfDay(baseDate)

  const checkinsByPeriod = new Map<string, number>()
  for (const checkin of checkins) {
    const checkinDate = normalizeCheckinDate(checkin.date)
    const periodKey = getPeriodKey(checkinDate, normalizedPeriod, weekStartDay)
    checkinsByPeriod.set(periodKey, (checkinsByPeriod.get(periodKey) ?? 0) + 1)
  }

  const skippedPeriods = new Set<string>()
  for (const skip of skips) {
    const skipDate = normalizeCheckinDate(skip.date)
    const periodKey = getPeriodKey(skipDate, normalizedPeriod, weekStartDay)
    skippedPeriods.add(periodKey)
  }

  const currentPeriodKey = getPeriodKey(currentDate, normalizedPeriod, weekStartDay)
  const currentCount = checkinsByPeriod.get(currentPeriodKey) ?? 0
  const currentSkipped = skippedPeriods.has(currentPeriodKey)

  if (currentCount < normalizedFrequency && !currentSkipped) {
    currentDate = getPreviousPeriod(currentDate, normalizedPeriod)
  }

  let consecutiveSkips = 0
  const MAX_CONSECUTIVE_SKIPS = 3

  for (let iteration = 0; iteration < MAX_STREAK_ITERATIONS; iteration += 1) {
    const periodKey = getPeriodKey(currentDate, normalizedPeriod, weekStartDay)
    const count = checkinsByPeriod.get(periodKey) ?? 0
    const skipped = skippedPeriods.has(periodKey)

    if (count >= normalizedFrequency) {
      streak++
      consecutiveSkips = 0
      currentDate = getPreviousPeriod(currentDate, normalizedPeriod)
    } else if (skipped && consecutiveSkips < MAX_CONSECUTIVE_SKIPS) {
      consecutiveSkips++
      currentDate = getPreviousPeriod(currentDate, normalizedPeriod)
    } else {
      return streak
    }
  }

  logWarn('habit.streak:iteration-limit', {
    habitId: habit.id,
    period: normalizedPeriod,
    maxIterations: MAX_STREAK_ITERATIONS,
  })

  return streak
}
