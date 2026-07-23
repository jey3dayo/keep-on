import type { InferSelectModel } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as habitQueries from '../habit'

type Habit = InferSelectModel<typeof import('@/db/schema').habits>

// Drizzle ORMのモック
vi.mock('@/lib/db', () => ({
  getDb: vi.fn().mockReturnValue({
    delete: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
    returning: vi.fn().mockResolvedValue([]),
    select: vi.fn().mockReturnThis(),
    selectDistinctOn: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  }),
}))

// getUserWeekStartのモック
vi.mock('@/lib/queries/user', () => ({
  getUserWeekStart: vi.fn().mockResolvedValue('monday'),
}))

import { getDb } from '@/lib/db'
import { getUserWeekStart } from '@/lib/queries/user'

const { getHabitById, getHabitsWithProgress } = habitQueries

afterEach(() => {
  vi.useRealTimers()
})

describe('getHabitsWithProgress', () => {
  const baseDate = new Date(2024, 0, 17, 12, 0, 0)
  const habits: Habit[] = [
    {
      color: 'orange',
      createdAt: new Date('2024-01-01'),
      frequency: 1,
      icon: 'footprints',
      id: 'habit-daily',
      name: '朝の運動',
      period: 'daily',
      updatedAt: new Date('2024-01-01'),
      userId: 'user-123',
    },
    {
      color: 'blue',
      createdAt: new Date('2024-01-02'),
      frequency: 3,
      icon: 'book-open',
      id: 'habit-weekly',
      name: '読書',
      period: 'weekly',
      updatedAt: new Date('2024-01-02'),
      userId: 'user-123',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('習慣がない場合は空配列を返す', async () => {
    const db = getDb()
    vi.mocked(db.orderBy).mockResolvedValueOnce([])

    const result = await getHabitsWithProgress('user-123', 'clerk-123', baseDate)

    expect(result).toEqual([])
    // habits/checkins/skips/weekStart は1段のPromise.allで並列実行するため、
    // habitsが空でもcheckins側のorderBy呼び出し(JOINクエリ)は発生する
    expect(db.orderBy).toHaveBeenCalledTimes(2)
  })

  it('進捗とストリークを計算して返す', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 0, 20, 12, 0, 0))

    const db = getDb()
    vi.mocked(db.orderBy)
      .mockResolvedValueOnce(habits)
      .mockResolvedValueOnce([
        { createdAt: baseDate, date: new Date(2024, 0, 17), habitId: 'habit-daily', id: 'checkin-1' },
        { createdAt: baseDate, date: new Date(2024, 0, 17), habitId: 'habit-weekly', id: 'checkin-5' },
      ])
    // スキップクエリ（3回目の where() 呼び出し）のモック
    vi.mocked(db.where)
      .mockReturnValueOnce(db as any)
      .mockReturnValueOnce(db as any)
      .mockResolvedValueOnce([])

    const result = await getHabitsWithProgress('user-123', 'clerk-123', baseDate)

    expect(result).toHaveLength(2)

    const daily = result.find((habit) => habit.id === 'habit-daily')
    const weekly = result.find((habit) => habit.id === 'habit-weekly')

    expect(daily?.currentProgress).toBe(1)
    expect(daily?.streak).toBe(1)
    expect(daily?.completionRate).toBe(100)

    expect(weekly?.currentProgress).toBe(1)
    expect(weekly?.streak).toBe(0)
    expect(weekly?.completionRate).toBe(33)
  })

  it('日曜開始週でも当週のみを進捗に含める', async () => {
    const sundayBaseDate = new Date(2024, 0, 7, 12, 0, 0)
    const sundayHabits: Habit[] = [
      {
        color: 'green',
        createdAt: new Date('2024-01-01'),
        frequency: 1,
        icon: 'calendar-check',
        id: 'habit-weekly-sun',
        name: '週次の習慣',
        period: 'weekly',
        updatedAt: new Date('2024-01-01'),
        userId: 'user-123',
      },
    ]

    const db = getDb()
    vi.mocked(getUserWeekStart).mockResolvedValueOnce('sunday')
    vi.mocked(db.orderBy)
      .mockResolvedValueOnce(sundayHabits)
      .mockResolvedValueOnce([
        { createdAt: sundayBaseDate, date: new Date(2024, 0, 8), habitId: 'habit-weekly-sun', id: 'checkin-mon' },
      ])
    // スキップクエリ（3回目の where() 呼び出し）のモック
    vi.mocked(db.where)
      .mockReturnValueOnce(db as any)
      .mockReturnValueOnce(db as any)
      .mockResolvedValueOnce([])

    const result = await getHabitsWithProgress('user-123', 'clerk-123', sundayBaseDate)

    expect(result).toHaveLength(1)
    expect(result[0]?.currentProgress).toBe(1)
  })

  it('不正なperiodとfrequencyでもフォールバックして返す', async () => {
    const invalidDate = new Date(2024, 0, 20, 12, 0, 0)
    const invalidHabits: Habit[] = [
      {
        color: 'orange',
        createdAt: new Date('2024-01-03'),
        frequency: 0,
        icon: 'footprints',
        id: 'habit-invalid',
        name: '不正データ',
        period: 'invalid-period' as unknown as Habit['period'],
        updatedAt: new Date('2024-01-03'),
        userId: 'user-123',
      },
    ]

    const db = getDb()
    vi.mocked(db.orderBy)
      .mockResolvedValueOnce(invalidHabits)
      .mockResolvedValueOnce([
        { createdAt: invalidDate, date: new Date(2024, 0, 20), habitId: 'habit-invalid', id: 'checkin-invalid' },
      ])
    // スキップクエリ（3回目の where() 呼び出し）のモック
    vi.mocked(db.where)
      .mockReturnValueOnce(db as any)
      .mockReturnValueOnce(db as any)
      .mockResolvedValueOnce([])

    const result = await getHabitsWithProgress('user-123', 'clerk-123', invalidDate)

    expect(result).toHaveLength(1)
    expect(result[0]?.period).toBe('daily')
    expect(result[0]?.frequency).toBe(1)
    expect(result[0]?.currentProgress).toBe(1)
    expect(result[0]?.streak).toBe(1)
    expect(result[0]?.completionRate).toBe(100)
  })
})

describe('getHabitById', () => {
  const mockHabit: Habit = {
    createdAt: new Date('2024-01-01'),
    icon: 'footprints',
    id: 'habit-1',
    name: '朝の運動',
    updatedAt: new Date('2024-01-01'),
    userId: 'user-123',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('IDで習慣を取得', async () => {
    const db = getDb()
    vi.mocked(db.where).mockResolvedValueOnce([mockHabit])

    const result = await getHabitById('habit-1')

    expect(result).toEqual(mockHabit)
    expect(db.select).toHaveBeenCalled()
    expect(db.from).toHaveBeenCalled()
    expect(db.where).toHaveBeenCalled()
  })

  it('該当する習慣がない場合はnullを返す', async () => {
    const db = getDb()
    vi.mocked(db.where).mockResolvedValueOnce([])

    const result = await getHabitById('non-existent')

    expect(result).toBeNull()
  })
})
