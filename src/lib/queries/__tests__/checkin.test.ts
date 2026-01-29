import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createCheckin,
  deleteAllCheckinsByHabitAndPeriod,
  deleteLatestCheckinByHabitAndPeriod,
  getCheckinsByUserAndDate,
} from '../checkin'

vi.mock('@/lib/db', () => ({
  getDb: vi.fn().mockResolvedValue({
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
  }),
}))

import { getDb } from '@/lib/db'

describe('getCheckinsByUserAndDate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns checkins for the user and date', async () => {
    const db = await getDb()
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

    const result = await getCheckinsByUserAndDate('user-1', new Date('2024-01-01'))

    expect(result).toEqual(mockCheckins)
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
    const db = await getDb()
    const createdCheckin = {
      id: 'checkin-3',
      habitId: 'habit-3',
      date: '2024-01-02',
      createdAt: new Date('2024-01-02T08:00:00Z'),
    }

    vi.mocked(db.returning).mockResolvedValueOnce([createdCheckin])

    const result = await createCheckin({ habitId: 'habit-3', date: new Date('2024-01-02') })

    expect(result).toEqual(createdCheckin)
    expect(db.insert).toHaveBeenCalledTimes(1)
    expect(db.values).toHaveBeenCalledTimes(1)
    expect(db.returning).toHaveBeenCalledTimes(1)
  })
})

describe('deleteLatestCheckinByHabitAndPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns false when no checkin exists in the period', async () => {
    const db = await getDb()

    vi.mocked(db.limit).mockResolvedValueOnce([])

    const result = await deleteLatestCheckinByHabitAndPeriod('habit-1', new Date('2024-01-01'), 'daily')

    expect(result).toBe(false)
    expect(db.delete).not.toHaveBeenCalled()
  })

  it('deletes the latest checkin and returns true', async () => {
    const db = await getDb()
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
    const db = await getDb()
    const deleteResult = { rowCount: 2 }

    vi.mocked(db.where).mockResolvedValueOnce(deleteResult)

    const result = await deleteAllCheckinsByHabitAndPeriod('habit-2', new Date('2024-01-05'), 'weekly')

    expect(result).toEqual(deleteResult)
    expect(db.delete).toHaveBeenCalledTimes(1)
    expect(db.where).toHaveBeenCalledTimes(1)
  })
})
