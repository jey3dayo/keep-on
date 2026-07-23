import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('drizzle-orm', () => ({
  and: (...conditions: unknown[]) => ({ op: 'and', conditions }),
  eq: (left: unknown, right: unknown) => ({ op: 'eq', left, right }),
  gte: (left: unknown, right: unknown) => ({ op: 'gte', left, right }),
  lte: (left: unknown, right: unknown) => ({ op: 'lte', left, right }),
  desc: (value: unknown) => ({ op: 'desc', value }),
  sql: Object.assign((...values: unknown[]) => ({ sql: values }), {
    mapWith: (fn: unknown) => fn,
    raw: (str: string) => ({ raw: str }),
  }),
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
    all: vi.fn().mockResolvedValue([]),
  }

  return {
    getDb: vi.fn().mockReturnValue(mockDbMethods),
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
  conditions?: Condition[]
  left?: unknown
  op: 'and' | 'eq' | 'gte' | 'lte' | 'desc'
  right?: unknown
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

  it('returns deleted:false without issuing DELETE when the period count is 0 (1往復のみ)', async () => {
    const db = getDb()
    const targetDate = new Date(2024, 0, 1)

    // 事前カウント取得のみ0件
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 0 }])

    const result = await deleteLatestCheckinByHabitAndPeriod('habit-1', targetDate, 'daily')

    expect(result).toEqual({ deleted: false, currentCount: 0, checkin: null })
    expect(vi.mocked(getPeriodDateRange)).toHaveBeenCalledWith(targetDate, 'daily', 1)
    expect(db.delete).not.toHaveBeenCalled()
    expect(db.where).toHaveBeenCalledTimes(1)
  })

  it('uses weekStartDay when calculating weekly range', async () => {
    const db = getDb()
    const targetDate = new Date(2024, 0, 7)
    const weekStartDay = 0

    vi.mocked(db.where).mockResolvedValueOnce([{ count: 0 }])

    const result = await deleteLatestCheckinByHabitAndPeriod('habit-1', targetDate, 'weekly', weekStartDay)

    expect(result).toEqual({ deleted: false, currentCount: 0, checkin: null })
    expect(vi.mocked(getPeriodDateRange)).toHaveBeenCalledWith(targetDate, 'weekly', weekStartDay)
  })

  it('deletes the latest checkin and returns count-1 without re-counting (事前カウント値から算出)', async () => {
    const db = getDb()
    const latestCheckin = {
      id: 'checkin-4',
      habitId: 'habit-1',
      date: '2024-01-01',
      createdAt: new Date('2024-01-01T12:00:00Z'),
    }

    // 事前カウント取得: 2件
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 2 }])
    vi.mocked(db.returning).mockResolvedValueOnce([latestCheckin])

    const result = await deleteLatestCheckinByHabitAndPeriod('habit-1', new Date('2024-01-01'), 'daily')

    expect(result).toEqual({ deleted: true, currentCount: 1, checkin: latestCheckin })
    expect(db.delete).toHaveBeenCalledTimes(1)
    // 事前カウント取得(1回) + サブクエリDELETEのwhere()呼び出し(1回) の計2回
    expect(db.where).toHaveBeenCalledTimes(2)
    expect(db.returning).toHaveBeenCalledTimes(1)
  })

  it('returns deleted:false when DELETE affects no row despite a positive pre-count', async () => {
    const db = getDb()

    vi.mocked(db.where).mockResolvedValueOnce([{ count: 1 }])
    vi.mocked(db.returning).mockResolvedValueOnce([])

    const result = await deleteLatestCheckinByHabitAndPeriod('habit-1', new Date('2024-01-01'), 'daily')

    expect(result).toEqual({ deleted: false, currentCount: 1, checkin: null })
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

  it('creates a checkin atomically and fetches the resulting count', async () => {
    // レースコンディション解消の検証: 頻度上限チェックを INSERT 文自身の WHERE 句に
    // 埋め込むことで「カウント取得→INSERT」の非アトミックな旧実装のレースを解消している。
    // SQLite は RETURNING 句内のサブクエリを許可しないため、期間内カウントは別クエリ
    // （db.select 1回）で取得する。db.insert（ビルダー経由の旧実装）は呼ばれない。
    const db = getDb()
    const targetDate = new Date(2024, 0, 1)
    const normalizedDate = formatDateKey(targetDate)
    const insertedRow = {
      id: 'checkin-5',
      habitId: 'habit-5',
      date: normalizedDate,
      createdAt: '2024-01-01T10:00:00.000Z',
    }

    vi.mocked(db.all).mockResolvedValueOnce([insertedRow])
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
      checkin: {
        id: 'checkin-5',
        habitId: 'habit-5',
        date: normalizedDate,
        createdAt: '2024-01-01T10:00:00.000Z',
      },
    })
    expect(db.all).toHaveBeenCalledTimes(1)
    expect(db.select).toHaveBeenCalledTimes(1)
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('returns false and fetches the count when frequency limit is reached', async () => {
    // INSERT 文の WHERE 句で上限超過のため RETURNING が空になるケース。
    // このときのみカウント取得のための追加往復（db.select）を許容する。
    const db = getDb()
    const targetDate = new Date(2024, 0, 2)

    vi.mocked(db.all).mockResolvedValueOnce([])
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
    expect(db.all).toHaveBeenCalledTimes(1)
    expect(db.select).toHaveBeenCalledTimes(1)
  })

  it('throws when insert fails (UNIQUE制約は撤去済みのためエラーは常に伝播する)', async () => {
    const db = getDb()
    const targetDate = new Date(2024, 0, 4)

    vi.mocked(db.all).mockRejectedValueOnce(new Error('database is locked'))

    await expect(
      createCheckinWithLimit({
        habitId: 'habit-8',
        date: targetDate,
        period: 'daily',
        frequency: 3,
      })
    ).rejects.toThrow('database is locked')
  })

  it('throws when the inserted row is missing expected fields (型ガードの安全性検証)', async () => {
    const db = getDb()
    const targetDate = new Date(2024, 0, 5)

    vi.mocked(db.all).mockResolvedValueOnce([{ id: 'checkin-9', habitId: 'habit-9' }])

    await expect(
      createCheckinWithLimit({
        habitId: 'habit-9',
        date: targetDate,
        period: 'daily',
        frequency: 3,
      })
    ).rejects.toThrow('Unexpected checkin insert row shape')
  })
})
