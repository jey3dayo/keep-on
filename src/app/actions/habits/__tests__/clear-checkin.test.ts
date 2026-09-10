import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { habits } from '@/db/schema'
import { deleteCheckinsByHabitAndDate } from '@/lib/queries/checkin'
import { getHabitById } from '@/lib/queries/habit'
import { getServerDateKey, getServerTimeZone } from '@/lib/server/date'
import { syncUser } from '@/lib/user'
import { clearCheckinAction } from '../clear-checkin'

type Habit = typeof habits.$inferSelect

function buildHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    archived: false,
    archivedAt: null,
    color: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    frequency: 1,
    icon: null,
    id: 'habit-123',
    name: 'Test Habit',
    period: 'daily',
    reminderTime: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
    userId: 'user-123',
    ...overrides,
  }
}

function buildUser(overrides: { dayStartHour?: 24 | 25 | 26 | 27 | 28 | 29 } = {}) {
  return {
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    dayStartHour: overrides.dayStartHour ?? (24 as const),
    email: 'user@example.com',
    externalId: 'access-sub-123',
    id: 'user-123',
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    weekStart: 'monday' as const,
  }
}

vi.mock('@/lib/queries/checkin', () => ({
  deleteCheckinsByHabitAndDate: vi.fn(),
}))

vi.mock('@/lib/queries/habit', () => ({
  getHabitById: vi.fn(),
}))

vi.mock('@/lib/server/date', () => ({
  getServerDateKey: vi.fn(),
  getServerTimeZone: vi.fn(),
}))

vi.mock('@/lib/user', () => ({
  syncUser: vi.fn(),
}))

vi.mock('@/lib/cache/habit-cache', () => ({
  invalidateHabitsCache: vi.fn(),
}))

vi.mock('@/lib/cache/analytics-cache', () => ({
  invalidateAnalyticsCache: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('clearCheckinAction', () => {
  const habitId = 'habit-123'
  const todayKey = '2026-08-13'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerDateKey).mockResolvedValue(todayKey)
    vi.mocked(getServerTimeZone).mockResolvedValue('Asia/Tokyo')
    vi.mocked(syncUser).mockResolvedValue(buildUser())
    vi.mocked(getHabitById).mockResolvedValue(buildHabit({ id: habitId }))
    vi.mocked(deleteCheckinsByHabitAndDate).mockResolvedValue({ deleted: true, deletedCount: 2 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('未認証の場合はUnauthorizedErrorを返す', async () => {
    vi.mocked(syncUser).mockResolvedValue(null)

    const result = await clearCheckinAction(habitId)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.name).toBe('UnauthorizedError')
    }
    expect(deleteCheckinsByHabitAndDate).not.toHaveBeenCalled()
  })

  it('他ユーザーの習慣を指定するとAuthorizationErrorを返す', async () => {
    vi.mocked(getHabitById).mockResolvedValue(buildHabit({ id: habitId, userId: 'other-user' }))

    const result = await clearCheckinAction(habitId)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.name).toBe('AuthorizationError')
    }
    expect(deleteCheckinsByHabitAndDate).not.toHaveBeenCalled()
  })

  it('archived習慣を指定するとAuthorizationErrorを返す', async () => {
    vi.mocked(getHabitById).mockResolvedValue(buildHabit({ archived: true, id: habitId }))

    const result = await clearCheckinAction(habitId)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.name).toBe('AuthorizationError')
    }
  })

  it('指定した日付でdeleteCheckinsByHabitAndDateを呼び出す', async () => {
    const result = await clearCheckinAction(habitId, '2026-08-01')

    expect(result.ok).toBe(true)
    expect(deleteCheckinsByHabitAndDate).toHaveBeenCalledWith(habitId, '2026-08-01')
    if (result.ok) {
      expect(result.data).toEqual({ deleted: true, deletedCount: 2 })
    }
  })

  it('dateKey省略時はtodayKeyを使う', async () => {
    await clearCheckinAction(habitId)

    expect(deleteCheckinsByHabitAndDate).toHaveBeenCalledWith(habitId, todayKey)
  })

  it('365日より前のdateKeyはValidationErrorを返す', async () => {
    const result = await clearCheckinAction(habitId, '2025-08-01')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.name).toBe('ValidationError')
    }
    expect(deleteCheckinsByHabitAndDate).not.toHaveBeenCalled()
  })

  it('削除対象がない場合はdeleted:falseを返す', async () => {
    vi.mocked(deleteCheckinsByHabitAndDate).mockResolvedValue({ deleted: false, deletedCount: 0 })

    const result = await clearCheckinAction(habitId)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual({ deleted: false, deletedCount: 0 })
    }
  })
})
