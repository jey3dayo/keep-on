import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { habits } from '@/db/schema'
import { createCheckinWithLimit } from '@/lib/queries/checkin'
import { getHabitById } from '@/lib/queries/habit'
import { getServerDateKey, getServerTimeZone } from '@/lib/server/date'
import { syncUser } from '@/lib/user'
import { addCheckinAction } from '../checkin'

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

function buildUser(overrides: { dayStartHour?: 24 | 25 | 26 | 27 | 28 | 29; weekStart?: 'monday' | 'sunday' } = {}) {
  return {
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    dayStartHour: overrides.dayStartHour ?? (24 as const),
    email: 'user@example.com',
    externalId: 'access-sub-123',
    id: 'user-123',
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    weekStart: overrides.weekStart ?? ('monday' as const),
  }
}

vi.mock('@/lib/queries/checkin', () => ({
  createCheckinWithLimit: vi.fn(),
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

describe('addCheckinAction', () => {
  const habitId = 'habit-123'
  const todayKey = '2026-08-13'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerDateKey).mockResolvedValue(todayKey)
    vi.mocked(getServerTimeZone).mockResolvedValue('Asia/Tokyo')
    vi.mocked(syncUser).mockResolvedValue(buildUser())
    vi.mocked(getHabitById).mockResolvedValue(buildHabit({ id: habitId }))
    vi.mocked(createCheckinWithLimit).mockResolvedValue({ checkin: null, created: true, currentCount: 1 })
  })

  it('未認証の場合はUnauthorizedErrorを返す', async () => {
    vi.mocked(syncUser).mockResolvedValue(null)

    const result = await addCheckinAction(habitId)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.name).toBe('UnauthorizedError')
    }
    expect(getServerDateKey).not.toHaveBeenCalled()
  })

  it('ユーザーのdayStartHourをgetServerDateKeyへ渡す', async () => {
    vi.mocked(syncUser).mockResolvedValue(buildUser({ dayStartHour: 26 }))

    await addCheckinAction(habitId)

    expect(getServerDateKey).toHaveBeenCalledWith(expect.objectContaining({ dayStartHour: 26 }))
  })

  it('occurredAtがdateKeyより優先してチェックイン日として採用される', async () => {
    // dayStartHour=26（2:00が境界）。2026-08-14 01:30 JST はまだ前日(08-13)扱い
    vi.mocked(syncUser).mockResolvedValue(buildUser({ dayStartHour: 26 }))
    vi.mocked(getServerDateKey).mockResolvedValue('2026-08-13')

    // クライアントは暦どおりの当日（08-14）を dateKey として送ってくる想定
    const result = await addCheckinAction(habitId, '2026-08-14', undefined, '2026-08-13T16:30:00.000Z')

    expect(result.ok).toBe(true)
    expect(createCheckinWithLimit).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-08-13' }))
  })

  it('occurredAtが無い場合は従来どおりdateKeyを採用する', async () => {
    const result = await addCheckinAction(habitId, '2026-08-13')

    expect(result.ok).toBe(true)
    expect(createCheckinWithLimit).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-08-13' }))
  })

  it('timeZone引数がcookieのタイムゾーンより優先される', async () => {
    const result = await addCheckinAction(
      habitId,
      '2026-08-14',
      undefined,
      '2026-08-14T00:30:00.000Z',
      'America/Los_Angeles'
    )

    expect(result.ok).toBe(true)
    expect(createCheckinWithLimit).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-08-13' }))
  })

  it('ユーザーのweekStartから週開始日を解決してcreateCheckinWithLimitへ渡す（sunday）', async () => {
    vi.mocked(syncUser).mockResolvedValue(buildUser({ weekStart: 'sunday' }))

    await addCheckinAction(habitId)

    expect(createCheckinWithLimit).toHaveBeenCalledWith(expect.objectContaining({ weekStartDay: 0 }))
  })

  it('ユーザーのweekStartから週開始日を解決してcreateCheckinWithLimitへ渡す（monday）', async () => {
    vi.mocked(syncUser).mockResolvedValue(buildUser({ weekStart: 'monday' }))

    await addCheckinAction(habitId)

    expect(createCheckinWithLimit).toHaveBeenCalledWith(expect.objectContaining({ weekStartDay: 1 }))
  })
})
