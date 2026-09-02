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
  dayStartHour: 24,
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

const nextSettingsWithDayStartHour = {
  ...previousSettings,
  dayStartHour: 26,
  updatedAt: '2026-01-02T00:00:00.000Z',
} satisfies UserSettings

const nextSettingsWithBoth = {
  ...previousSettings,
  dayStartHour: 26,
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

  it('dayStartHour変更時にユーザー・習慣・アナリティクスのキャッシュを無効化する', async () => {
    insertQuery.returning.mockResolvedValue([nextSettingsWithDayStartHour])

    const result = await updateUserSettings('user-123', { dayStartHour: 26 })

    expect(result).toEqual(nextSettingsWithDayStartHour)
    expect(invalidateUserCache).toHaveBeenCalledWith('access-sub-123')
    expect(invalidateHabitsCache).toHaveBeenCalledWith('user-123')
    expect(invalidateAnalyticsCache).toHaveBeenCalledWith('user-123')
  })

  it('users.dayStartHourの更新に失敗したらuserSettingsをロールバックしてエラーを投げる', async () => {
    insertQuery.returning.mockResolvedValue([nextSettingsWithDayStartHour])
    updateQuery.returning.mockRejectedValue(new Error('D1 unavailable'))

    await expect(updateUserSettings('user-123', { dayStartHour: 26 })).rejects.toThrow(
      'Failed to update users.dayStartHour. Settings have been rolled back.'
    )

    // ロールバックは upsert 前の userSettings 行（previousSettings）へ戻す
    expect(updateQuery.set).toHaveBeenCalledWith(
      expect.objectContaining({
        colorTheme: previousSettings.colorTheme,
        dayStartHour: previousSettings.dayStartHour,
        weekStart: previousSettings.weekStart,
      })
    )
  })

  it('weekStartとdayStartHourを同時変更すると両方がusersへ反映され、キャッシュが無効化される', async () => {
    insertQuery.returning.mockResolvedValue([nextSettingsWithBoth])

    const result = await updateUserSettings('user-123', { dayStartHour: 26, weekStart: 'sunday' })

    expect(result).toEqual(nextSettingsWithBoth)
    // users への複製列は weekStart / dayStartHour の両方を含む一度の patch で反映される
    expect(updateQuery.set).toHaveBeenCalledWith({ dayStartHour: 26, weekStart: 'sunday' })
    expect(invalidateUserCache).toHaveBeenCalledWith('access-sub-123')
    expect(invalidateHabitsCache).toHaveBeenCalledWith('user-123')
    expect(invalidateAnalyticsCache).toHaveBeenCalledWith('user-123')
  })

  it('weekStartとdayStartHourの同時更新に失敗したら両方をuserSettingsへロールバックしてエラーを投げる', async () => {
    insertQuery.returning.mockResolvedValue([nextSettingsWithBoth])
    updateQuery.returning.mockRejectedValue(new Error('D1 unavailable'))

    await expect(updateUserSettings('user-123', { dayStartHour: 26, weekStart: 'sunday' })).rejects.toThrow(
      'Failed to update users.{weekStart, dayStartHour}. Settings have been rolled back.'
    )

    // ロールバックは upsert 前の userSettings 行（previousSettings）へ、weekStart/dayStartHour 両方を戻す
    expect(updateQuery.set).toHaveBeenCalledWith(
      expect.objectContaining({
        colorTheme: previousSettings.colorTheme,
        dayStartHour: previousSettings.dayStartHour,
        weekStart: previousSettings.weekStart,
      })
    )
  })
})
