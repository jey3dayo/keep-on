import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { syncUser } from '@/lib/user'
import type { User } from '@/types/user'
import SettingsPage from './page'

const { notFoundMock, redirectMock, cookiesMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  notFoundMock: vi.fn(),
  redirectMock: vi.fn(() => {
    throw new Error('REDIRECT')
  }),
}))

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}))

vi.mock('next/headers', () => ({
  cookies: cookiesMock,
}))

vi.mock('@/lib/user', () => ({
  syncUser: vi.fn(),
}))

vi.mock('@/components/settings/DayStartHourSettings', () => ({
  DayStartHourSettings: ({ initialDayStartHour }: { initialDayStartHour: number }) => (
    <div data-testid="day-start-hour-settings">{initialDayStartHour}</div>
  ),
}))

function buildUser(dayStartHour: User['dayStartHour']): User {
  return {
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    dayStartHour,
    email: 'user@example.com',
    externalId: 'external-id',
    id: 'user-1',
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    weekStart: 'monday',
  }
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cookiesMock.mockResolvedValue({ get: () => undefined })
  })

  it('未認証の場合はサインインページへリダイレクトする', async () => {
    vi.mocked(syncUser).mockResolvedValue(null)

    await expect(SettingsPage()).rejects.toThrow('REDIRECT')

    expect(redirectMock).toHaveBeenCalled()
  })

  it('user.dayStartHour を DayStartHourSettings の初期値として渡す', async () => {
    vi.mocked(syncUser).mockResolvedValue(buildUser(26))

    render(await SettingsPage())

    expect(screen.getByTestId('day-start-hour-settings')).toHaveTextContent('26')
  })
})
