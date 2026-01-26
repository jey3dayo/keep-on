import type { InferSelectModel } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as habitQueries from '../habit'

type Habit = InferSelectModel<typeof import('@/db/schema').habits>

// Drizzle ORMのモック
vi.mock('@/lib/db', () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
  }),
}))

import { getDb } from '@/lib/db'

const { calculateStreak, getCheckinCountForPeriod, getHabitById, getHabitsByUserId, getHabitsWithProgress } =
  habitQueries

afterEach(() => {
  vi.useRealTimers()
})

describe('getHabitsByUserId', () => {
  const mockHabits: Habit[] = [
    {
      id: 'habit-1',
      userId: 'user-123',
      name: '朝の運動',
      icon: 'footprints',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'habit-2',
      userId: 'user-123',
      name: '読書',
      icon: 'book-open',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ユーザーIDで習慣一覧を取得', async () => {
    const db = await getDb()
    vi.mocked(db.orderBy).mockResolvedValueOnce(mockHabits)

    const result = await getHabitsByUserId('user-123')

    expect(result).toEqual(mockHabits)
    expect(db.select).toHaveBeenCalled()
    expect(db.from).toHaveBeenCalled()
    expect(db.where).toHaveBeenCalled()
    expect(db.orderBy).toHaveBeenCalled()
  })

  it('該当する習慣がない場合は空配列を返す', async () => {
    const db = await getDb()
    vi.mocked(db.orderBy).mockResolvedValueOnce([])

    const result = await getHabitsByUserId('user-456')

    expect(result).toEqual([])
  })
})

describe('getCheckinCountForPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('チェックイン数を返す', async () => {
    const db = await getDb()
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 2 }])

    const result = await getCheckinCountForPeriod('habit-1', new Date(2024, 0, 15), 'daily')

    expect(result).toBe(2)
    expect(db.select).toHaveBeenCalled()
    expect(db.from).toHaveBeenCalled()
    expect(db.where).toHaveBeenCalled()
  })

  it('結果が空の場合は0を返す', async () => {
    const db = await getDb()
    vi.mocked(db.where).mockResolvedValueOnce([])

    const result = await getCheckinCountForPeriod('habit-1', new Date(2024, 0, 15), 'daily')

    expect(result).toBe(0)
  })
})

describe('calculateStreak', () => {
  const baseHabit: Habit = {
    id: 'habit-1',
    userId: 'user-123',
    name: '朝の運動',
    icon: 'footprints',
    color: 'orange',
    period: 'daily',
    frequency: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('習慣が存在しない場合は0を返す', async () => {
    const db = await getDb()
    vi.mocked(db.where).mockResolvedValueOnce([])

    const result = await calculateStreak('habit-1', 'daily')

    expect(result).toBe(0)
  })

  it('現在期間が未達成の場合は前期間からストリークを数える', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 0, 17, 12, 0, 0))

    const db = await getDb()
    vi.mocked(db.where).mockResolvedValueOnce([baseHabit])
    vi.mocked(db.orderBy).mockResolvedValueOnce([{ date: new Date(2024, 0, 16) }, { date: new Date(2024, 0, 15) }])

    const result = await calculateStreak('habit-1', 'daily')

    expect(result).toBe(2)
  })
})

describe('getHabitsWithProgress', () => {
  const baseDate = new Date(2024, 0, 17, 12, 0, 0)
  const habits: Habit[] = [
    {
      id: 'habit-daily',
      userId: 'user-123',
      name: '朝の運動',
      icon: 'footprints',
      color: 'orange',
      period: 'daily',
      frequency: 1,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'habit-weekly',
      userId: 'user-123',
      name: '読書',
      icon: 'book-open',
      color: 'blue',
      period: 'weekly',
      frequency: 3,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('習慣がない場合は空配列を返す', async () => {
    const db = await getDb()
    vi.mocked(db.orderBy).mockResolvedValueOnce([])

    const result = await getHabitsWithProgress('user-123', baseDate)

    expect(result).toEqual([])
    expect(db.orderBy).toHaveBeenCalledTimes(1)
  })

  it('進捗とストリークを計算して返す', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(baseDate)

    const db = await getDb()
    vi.mocked(db.orderBy)
      .mockResolvedValueOnce(habits)
      .mockResolvedValueOnce([
        { id: 'checkin-1', habitId: 'habit-daily', date: new Date(2024, 0, 17), createdAt: baseDate },
        { id: 'checkin-2', habitId: 'habit-daily', date: new Date(2024, 0, 16), createdAt: baseDate },
        { id: 'checkin-3', habitId: 'habit-weekly', date: new Date(2024, 0, 15), createdAt: baseDate },
        { id: 'checkin-4', habitId: 'habit-weekly', date: new Date(2024, 0, 16), createdAt: baseDate },
        { id: 'checkin-5', habitId: 'habit-weekly', date: new Date(2024, 0, 17), createdAt: baseDate },
      ])

    const result = await getHabitsWithProgress('user-123', baseDate)

    expect(result).toHaveLength(2)

    const daily = result.find((habit) => habit.id === 'habit-daily')
    const weekly = result.find((habit) => habit.id === 'habit-weekly')

    expect(daily?.currentProgress).toBe(1)
    expect(daily?.streak).toBe(2)
    expect(daily?.completionRate).toBe(100)

    expect(weekly?.currentProgress).toBe(3)
    expect(weekly?.streak).toBe(1)
    expect(weekly?.completionRate).toBe(100)
  })
})

describe('getHabitById', () => {
  const mockHabit: Habit = {
    id: 'habit-1',
    userId: 'user-123',
    name: '朝の運動',
    icon: 'footprints',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('IDで習慣を取得', async () => {
    const db = await getDb()
    vi.mocked(db.where).mockResolvedValueOnce([mockHabit])

    const result = await getHabitById('habit-1')

    expect(result).toEqual(mockHabit)
    expect(db.select).toHaveBeenCalled()
    expect(db.from).toHaveBeenCalled()
    expect(db.where).toHaveBeenCalled()
  })

  it('該当する習慣がない場合はnullを返す', async () => {
    const db = await getDb()
    vi.mocked(db.where).mockResolvedValueOnce([])

    const result = await getHabitById('non-existent')

    expect(result).toBeNull()
  })
})
