import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invalidateAnalyticsCache } from '@/lib/cache/analytics-cache'
import { invalidateHabitsCache } from '@/lib/cache/habit-cache'
import { invalidateUserCache } from '@/lib/cache/user-cache'
import type { UserSettings } from '@/types/user-settings'
import { updateUserSettings } from '../user-settings'

const { db, insertQuery, selectQuery, updateQuery } = vi.hoisted(() => {
  const selectQueryMock = {
    from: vi.fn(),
    where: vi.fn(),
  }
  const insertQueryMock = {
    onConflictDoUpdate: vi.fn(),
    returning: vi.fn(),
    values: vi.fn(),
  }
  const updateQueryMock = {
    returning: vi.fn(),
    set: vi.fn(),
    where: vi.fn(),
  }
  const dbMock = {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  }

  selectQueryMock.from.mockReturnValue(selectQueryMock)
  insertQueryMock.values.mockReturnValue(insertQueryMock)
  insertQueryMock.onConflictDoUpdate.mockReturnValue(insertQueryMock)
  updateQueryMock.set.mockReturnValue(updateQueryMock)
  updateQueryMock.where.mockReturnValue(updateQueryMock)
  dbMock.select.mockReturnValue(selectQueryMock)
  dbMock.insert.mockReturnValue(insertQueryMock)
  dbMock.update.mockReturnValue(updateQueryMock)

  return { db: dbMock, insertQuery: insertQueryMock, selectQuery: selectQueryMock, updateQuery: updateQueryMock }
})

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(() => db),
}))

vi.mock('@/lib/cache/analytics-cache', () => ({
  invalidateAnalyticsCache: vi.fn(),
}))

vi.mock('@/lib/cache/habit-cache', () => ({
  invalidateHabitsCache: vi.fn(),
}))

vi.mock('@/lib/cache/user-cache', () => ({
  invalidateUserCache: vi.fn(),
}))

const previousSettings = {
  colorTheme: 'orange',
  createdAt: '2026-01-01T00:00:00.000Z',
  id: 'settings-123',
  themeMode: 'light',
  updatedAt: '2026-01-01T00:00:00.000Z',
  userId: 'user-123',
  weekStart: 'monday',
} satisfies UserSettings

const nextSettings = {
  ...previousSettings,
  updatedAt: '2026-01-02T00:00:00.000Z',
  weekStart: 'sunday',
} satisfies UserSettings

describe('updateUserSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectQuery.where.mockResolvedValue([previousSettings])
    insertQuery.returning.mockResolvedValue([nextSettings])
    updateQuery.returning.mockResolvedValue([{ externalId: 'access-sub-123' }])
  })

  it('weekStart変更時にユーザー・習慣・アナリティクスのキャッシュを無効化する', async () => {
    const result = await updateUserSettings('user-123', { weekStart: 'sunday' })

    expect(result).toEqual(nextSettings)
    expect(invalidateUserCache).toHaveBeenCalledWith('access-sub-123')
    expect(invalidateHabitsCache).toHaveBeenCalledWith('user-123')
    expect(invalidateAnalyticsCache).toHaveBeenCalledWith('user-123')
  })

  it('キャッシュ無効化が失敗しても設定更新は成功する', async () => {
    vi.mocked(invalidateHabitsCache).mockRejectedValueOnce(new Error('KV unavailable'))

    const result = await updateUserSettings('user-123', { weekStart: 'sunday' })

    expect(result).toEqual(nextSettings)
  })
})
