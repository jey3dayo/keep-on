import { revalidatePath } from 'next/cache'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { updateUserSettings } from '@/lib/queries/user-settings'
import type { UserSettings } from '@/types/user-settings'
import { updateUserSettingsAction } from '../updateUserSettings'

vi.mock('@/lib/queries/user-settings', () => ({
  updateUserSettings: vi.fn(),
}))

vi.mock('@/lib/user', () => ({
  getCurrentUserId: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('updateUserSettingsAction', () => {
  const userId = 'user-123'

  const mockSettings = {
    colorTheme: 'orange',
    createdAt: '2026-01-01T00:00:00.000Z',
    dayStartHour: 24,
    id: 'settings-123',
    themeMode: 'dark',
    updatedAt: '2026-01-01T00:00:00.000Z',
    userId,
    weekStart: 'monday',
  } satisfies UserSettings

  beforeEach(async () => {
    vi.clearAllMocks()
    const { getCurrentUserId } = await import('@/lib/user')
    vi.mocked(getCurrentUserId).mockResolvedValue(userId)
  })

  it('認証済みユーザーが設定を更新できる', async () => {
    vi.mocked(updateUserSettings).mockResolvedValue(mockSettings)

    const result = await updateUserSettingsAction({ themeMode: 'dark' })

    expect(result.ok).toBe(true)
    expect(updateUserSettings).toHaveBeenCalledWith(userId, { themeMode: 'dark' })
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(revalidatePath).toHaveBeenCalledWith('/settings')
    expect(revalidatePath).toHaveBeenCalledWith('/habits')
    expect(revalidatePath).toHaveBeenCalledWith('/analytics')
  })

  it('未認証ユーザーはUnauthorizedErrorを取得', async () => {
    const { getCurrentUserId } = await import('@/lib/user')
    vi.mocked(getCurrentUserId).mockResolvedValue(null)

    const result = await updateUserSettingsAction({ themeMode: 'dark' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.name).toBe('UnauthorizedError')
    }
    expect(updateUserSettings).not.toHaveBeenCalled()
  })

  it('不正な値は拒否され、DB層は呼ばれない', async () => {
    const input: Record<string, unknown> = { themeMode: 'rainbow' }

    const result = await updateUserSettingsAction(input)

    expect(result.ok).toBe(false)
    expect(updateUserSettings).not.toHaveBeenCalled()
  })

  it('dayStartHourを更新できる', async () => {
    vi.mocked(updateUserSettings).mockResolvedValue({ ...mockSettings, dayStartHour: 26 })

    const result = await updateUserSettingsAction({ dayStartHour: 26 })

    expect(result.ok).toBe(true)
    expect(updateUserSettings).toHaveBeenCalledWith(userId, { dayStartHour: 26 })
  })

  it('選択肢外のdayStartHourは拒否され、DB層は呼ばれない', async () => {
    const input: Record<string, unknown> = { dayStartHour: 30 }

    const result = await updateUserSettingsAction(input)

    expect(result.ok).toBe(false)
    expect(updateUserSettings).not.toHaveBeenCalled()
  })

  it('余分なキー（userId / id）はDB層へ渡らない', async () => {
    vi.mocked(updateUserSettings).mockResolvedValue(mockSettings)

    const input: Record<string, unknown> = {
      id: 'forged-id',
      themeMode: 'dark',
      userId: 'attacker-user-id',
    }

    const result = await updateUserSettingsAction(input)

    expect(result.ok).toBe(true)
    const passedSettings = vi.mocked(updateUserSettings).mock.calls[0]?.[1]
    expect(passedSettings).not.toHaveProperty('userId')
    expect(passedSettings).not.toHaveProperty('id')
    expect(passedSettings).toEqual({ themeMode: 'dark' })
  })
})
