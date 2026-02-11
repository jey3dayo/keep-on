import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('drizzle-orm', () => ({
  and: (...conditions: unknown[]) => ({ op: 'and', conditions }),
  eq: (left: unknown, right: unknown) => ({ op: 'eq', left, right }),
  gte: (left: unknown, right: unknown) => ({ op: 'gte', left, right }),
  lte: (left: unknown, right: unknown) => ({ op: 'lte', left, right }),
  desc: (value: unknown) => ({ op: 'desc', value }),
  sql: Object.assign((...values: unknown[]) => ({ sql: values }), { mapWith: (fn: unknown) => fn }),
}))

vi.mock('@/lib/utils/date', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/date')>()
  return {
    ...actual,
    normalizeDateKey: vi.fn(actual.normalizeDateKey),
  }
})

vi.mock('@/lib/queries/period', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/queries/period')>()
  return {
    ...actual,
    getPeriodDateRange: vi.fn(actual.getPeriodDateRange),
  }
})

vi.mock('@/lib/db', () => {
  const mockDbMethods = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue({}),
  }

  return {
    getDb: vi.fn().mockReturnValue({
      ...mockDbMethods,
      transaction: vi.fn(async (callback) => {
        // トランザクション内では同じメソッドセットを返す
        return await callback(mockDbMethods)
      }),
    }),
  }
})

import { getDb } from '@/lib/db'
import { getPeriodDateRange } from '@/lib/queries/period'
import { formatDateKey, normalizeDateKey } from '@/lib/utils/date'
import {
  createCheckin,
  createCheckinWithLimit,
  deleteAllCheckinsByHabitAndPeriod,
  deleteLatestCheckinByHabitAndPeriod,
  getCheckinsByUserAndDate,
} from '../checkin'

interface Condition {
  op: 'and' | 'eq' | 'gte' | 'lte' | 'desc'
  left?: unknown
  right?: unknown
  conditions?: Condition[]
}

describe('getCheckinsByUserAndDate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns checkins for the user and date', async () => {
    const db = getDb()
    const targetDate = new Date(2024, 0, 1)
    const normalizedDate = formatDateKey(targetDate)
    const mockCheckins = [
      {
        id: 'checkin-1',
        habitId: 'habit-1',
        date: '2024-01-01',
        createdAt: new Date('2024-01-01T09:00:00Z'),
      },
      {
        id: 'checkin-2',
        habitId: 'habit-2',
        date: '2024-01-01',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      },
    ]

    vi.mocked(db.where).mockResolvedValueOnce(
      mockCheckins.map((checkin) => ({
        Checkin: checkin,
      }))
    )

    const result = await getCheckinsByUserAndDate('user-1', targetDate)
    const whereArg = vi.mocked(db.where).mock.calls[0]?.[0] as Condition | undefined
    const dateCondition = whereArg?.conditions?.find(
      (condition) => condition.op === 'eq' && condition.right === normalizedDate
    )

    expect(result).toEqual(mockCheckins)
    expect(vi.mocked(normalizeDateKey)).toHaveBeenCalledWith(targetDate)
    expect(dateCondition).toBeTruthy()
    expect(db.select).toHaveBeenCalledTimes(1)
    expect(db.innerJoin).toHaveBeenCalledTimes(1)
    expect(db.where).toHaveBeenCalledTimes(1)
  })
})

describe('createCheckin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a checkin and returns it', async () => {
    const db = getDb()
    const targetDate = new Date(2024, 0, 2)
    const normalizedDate = formatDateKey(targetDate)
    const createdCheckin = {
      id: 'checkin-3',
      habitId: 'habit-3',
      date: '2024-01-02',
      createdAt: new Date('2024-01-02T08:00:00Z'),
    }

    vi.mocked(db.returning).mockResolvedValueOnce([createdCheckin])

    const result = await createCheckin({ habitId: 'habit-3', date: targetDate })

    expect(result).toEqual(createdCheckin)
    expect(vi.mocked(normalizeDateKey)).toHaveBeenCalledWith(targetDate)
    expect(db.insert).toHaveBeenCalledTimes(1)
    expect(db.values).toHaveBeenCalledWith({ habitId: 'habit-3', date: normalizedDate })
    expect(db.values).toHaveBeenCalledTimes(1)
    expect(db.returning).toHaveBeenCalledTimes(1)
  })
})

describe('deleteLatestCheckinByHabitAndPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns false when no checkin exists in the period', async () => {
    const db = getDb()
    const targetDate = new Date(2024, 0, 1)

    vi.mocked(db.limit).mockResolvedValueOnce([])

    const result = await deleteLatestCheckinByHabitAndPeriod('habit-1', targetDate, 'daily')
    const range = vi.mocked(getPeriodDateRange).mock.results[0]?.value
    const whereArg = vi.mocked(db.where).mock.calls[0]?.[0] as Condition | undefined
    const startCondition = whereArg?.conditions?.find(
      (condition) => condition.op === 'gte' && condition.right === range?.startKey
    )
    const endCondition = whereArg?.conditions?.find(
      (condition) => condition.op === 'lte' && condition.right === range?.endKey
    )

    expect(result).toBe(false)
    expect(vi.mocked(getPeriodDateRange)).toHaveBeenCalledWith(targetDate, 'daily', 1)
    expect(startCondition).toBeTruthy()
    expect(endCondition).toBeTruthy()
    expect(db.delete).not.toHaveBeenCalled()
  })

  it('uses weekStartDay when calculating weekly range', async () => {
    const db = getDb()
    const targetDate = new Date(2024, 0, 7)
    const weekStartDay = 0

    vi.mocked(db.limit).mockResolvedValueOnce([])

    const result = await deleteLatestCheckinByHabitAndPeriod('habit-1', targetDate, 'weekly', weekStartDay)
    const range = vi.mocked(getPeriodDateRange).mock.results[0]?.value
    const whereArg = vi.mocked(db.where).mock.calls[0]?.[0] as Condition | undefined
    const startCondition = whereArg?.conditions?.find(
      (condition) => condition.op === 'gte' && condition.right === range?.startKey
    )
    const endCondition = whereArg?.conditions?.find(
      (condition) => condition.op === 'lte' && condition.right === range?.endKey
    )

    expect(result).toBe(false)
    expect(vi.mocked(getPeriodDateRange)).toHaveBeenCalledWith(targetDate, 'weekly', weekStartDay)
    expect(startCondition).toBeTruthy()
    expect(endCondition).toBeTruthy()
  })

  it('deletes the latest checkin and returns true', async () => {
    const db = getDb()
    const latestCheckin = {
      id: 'checkin-4',
      habitId: 'habit-1',
      date: '2024-01-01',
      createdAt: new Date('2024-01-01T12:00:00Z'),
    }

    vi.mocked(db.limit).mockResolvedValueOnce([latestCheckin])

    const result = await deleteLatestCheckinByHabitAndPeriod('habit-1', new Date('2024-01-01'), 'daily')

    expect(result).toBe(true)
    expect(db.delete).toHaveBeenCalledTimes(1)
    expect(db.where).toHaveBeenCalledTimes(2)
  })
})

describe('deleteAllCheckinsByHabitAndPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes all checkins in the period', async () => {
    const db = getDb()
    const targetDate = new Date(2024, 0, 5)
    const deleteResult = { rowCount: 2 }

    vi.mocked(db.where).mockResolvedValueOnce(deleteResult)

    const result = await deleteAllCheckinsByHabitAndPeriod('habit-2', targetDate, 'weekly')
    const range = vi.mocked(getPeriodDateRange).mock.results[0]?.value
    const whereArg = vi.mocked(db.where).mock.calls[0]?.[0] as Condition | undefined
    const startCondition = whereArg?.conditions?.find(
      (condition) => condition.op === 'gte' && condition.right === range?.startKey
    )
    const endCondition = whereArg?.conditions?.find(
      (condition) => condition.op === 'lte' && condition.right === range?.endKey
    )

    expect(result).toEqual(deleteResult)
    expect(vi.mocked(getPeriodDateRange)).toHaveBeenCalledWith(targetDate, 'weekly', 1)
    expect(startCondition).toBeTruthy()
    expect(endCondition).toBeTruthy()
    expect(db.delete).toHaveBeenCalledTimes(1)
    expect(db.where).toHaveBeenCalledTimes(1)
  })
})

describe('createCheckinWithLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a checkin when under frequency limit', async () => {
    const db = getDb()
    const targetDate = new Date(2024, 0, 1)
    const normalizedDate = formatDateKey(targetDate)
    const createdCheckin = {
      id: 'checkin-5',
      habitId: 'habit-5',
      date: normalizedDate,
      createdAt: new Date('2024-01-01T10:00:00Z'),
    }

    // Mock COUNT query to return 2 (under limit of 3)
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 2 }])
    // Mock INSERT with RETURNING
    vi.mocked(db.returning).mockResolvedValueOnce([createdCheckin])
    // Mock final COUNT query after INSERT (should return 3 = 2 + 1)
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 3 }])

    const result = await createCheckinWithLimit({
      habitId: 'habit-5',
      date: targetDate,
      period: 'daily',
      frequency: 3,
    })

    expect(result).toEqual({
      created: true,
      currentCount: 3,
      checkin: createdCheckin,
    })
    expect(db.insert).toHaveBeenCalledTimes(1)
    expect(db.returning).toHaveBeenCalledTimes(1)
  })

  it('returns false when frequency limit is reached', async () => {
    const db = getDb()
    const targetDate = new Date(2024, 0, 2)

    // Mock COUNT query to return 3 (at limit)
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 3 }])

    const result = await createCheckinWithLimit({
      habitId: 'habit-6',
      date: targetDate,
      period: 'daily',
      frequency: 3,
    })

    expect(result).toEqual({
      created: false,
      currentCount: 3,
      checkin: null,
    })
    expect(db.insert).not.toHaveBeenCalled()
  })
})
