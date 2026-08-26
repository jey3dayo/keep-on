import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { habits } from '@/db/schema'
import { deleteAllCheckinsByHabitAndPeriod } from '@/lib/queries/checkin'
import { getHabitById } from '@/lib/queries/habit'
import { getServerDateKey } from '@/lib/server/date'
import { getCurrentUserId } from '@/lib/user'
import { resetHabitProgressAction } from '../reset'

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

vi.mock('@/lib/queries/checkin', () => ({
  deleteAllCheckinsByHabitAndPeriod: vi.fn(),
}))

vi.mock('@/lib/queries/habit', () => ({
  getHabitById: vi.fn(),
}))

vi.mock('@/lib/server/date', () => ({
  getServerDateKey: vi.fn(),
}))

vi.mock('@/lib/user', () => ({
  getCurrentUserId: vi.fn(),
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

describe('resetHabitProgressAction', () => {
  const habitId = 'habit-123'
  const userId = 'user-123'
  const todayKey = '2026-08-13'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerDateKey).mockResolvedValue(todayKey)
    vi.mocked(getCurrentUserId).mockResolvedValue(userId)
    vi.mocked(deleteAllCheckinsByHabitAndPeriod).mockResolvedValue({
      meta: {
        changed_db: true,
        changes: 0,
        duration: 0,
        last_row_id: 0,
        rows_read: 0,
        rows_written: 0,
        size_after: 0,
      },
      results: [],
      success: true,
    })
  })

  it.each(['daily', 'weekly', 'monthly'] as const)(
    '%s習慣でも今日のチェックインだけを削除対象にする',
    async (period) => {
      vi.mocked(getHabitById).mockResolvedValue(buildHabit({ id: habitId, period, userId }))

      const result = await resetHabitProgressAction(habitId)

      expect(result.ok).toBe(true)
      expect(deleteAllCheckinsByHabitAndPeriod).toHaveBeenCalledWith(habitId, todayKey, 'daily')
    }
  )

  it('呼び出し元の過去dateKeyを受け取ってもサーバー側の今日だけを対象にする', async () => {
    vi.mocked(getHabitById).mockResolvedValue(buildHabit({ id: habitId, period: 'weekly', userId }))

    const result = await resetHabitProgressAction(habitId, '2026-08-12')

    expect(result.ok).toBe(true)
    expect(deleteAllCheckinsByHabitAndPeriod).toHaveBeenCalledWith(habitId, todayKey, 'daily')
  })

  it('未来2日以上のdateKeyはValidationErrorを返す', async () => {
    const result = await resetHabitProgressAction(habitId, '2026-08-15')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.name).toBe('ValidationError')
    }
    expect(getHabitById).not.toHaveBeenCalled()
  })

  it('366日以上過去のdateKeyはValidationErrorを返す', async () => {
    const result = await resetHabitProgressAction(habitId, '2025-08-12')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.name).toBe('ValidationError')
    }
    expect(getHabitById).not.toHaveBeenCalled()
  })

  it('アーカイブ済みの習慣はAuthorizationErrorを返す', async () => {
    vi.mocked(getHabitById).mockResolvedValue(buildHabit({ archived: true, id: habitId, userId }))

    const result = await resetHabitProgressAction(habitId)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.name).toBe('AuthorizationError')
    }
    expect(deleteAllCheckinsByHabitAndPeriod).not.toHaveBeenCalled()
  })

  it('他ユーザーの習慣はAuthorizationErrorを返す', async () => {
    vi.mocked(getHabitById).mockResolvedValue(buildHabit({ id: habitId, userId: 'other-user' }))

    const result = await resetHabitProgressAction(habitId)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.name).toBe('AuthorizationError')
    }
  })
})
