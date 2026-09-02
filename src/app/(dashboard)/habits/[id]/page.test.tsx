import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getHabitById } from '@/lib/queries/habit'
import { getHabitCalendarData } from '@/lib/queries/habit-calendar'
import { syncUser } from '@/lib/user'
import type { Habit } from '@/types/habit'
import type { User } from '@/types/user'
import HabitDetailPage from './page'

const { notFoundMock, redirectMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
  redirectMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}))

vi.mock('@/components/habits/HabitCalendarHeatmap', () => ({
  HabitCalendarHeatmap: () => null,
}))

vi.mock('@/lib/queries/habit', () => ({
  getHabitById: vi.fn(),
}))

vi.mock('@/lib/queries/habit-calendar', () => ({
  getHabitCalendarData: vi.fn(),
}))

vi.mock('@/lib/user', () => ({
  syncUser: vi.fn(),
}))

vi.mock('@/lib/server/date', () => ({
  getServerDateKey: vi.fn().mockResolvedValue('2026-01-01'),
}))

function buildUser(id: string): User {
  return {
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    dayStartHour: 24,
    email: 'user@example.com',
    externalId: 'external-id',
    id,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    weekStart: 'monday',
  }
}

function buildHabit(userId: string): Habit {
  return {
    archived: false,
    archivedAt: null,
    color: 'teal',
    createdAt: '2026-01-01T00:00:00.000Z',
    frequency: 1,
    icon: 'check',
    id: 'habit-123',
    name: 'テスト習慣',
    period: 'daily',
    reminderTime: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
    userId,
  }
}

describe('HabitDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(syncUser).mockResolvedValue(buildUser('user-123'))
    vi.mocked(getHabitCalendarData).mockResolvedValue({
      checkinCounts: new Map(),
      skipDates: new Set(),
    })
  })

  it.each([
    ['存在しない習慣', null],
    ['他人所有の習慣', buildHabit('other-user')],
  ] as const)('%sは404を返す', async (_label, habit) => {
    vi.mocked(getHabitById).mockResolvedValue(habit)

    await expect(HabitDetailPage({ params: Promise.resolve({ id: 'habit-123' }) })).rejects.toThrow('NOT_FOUND')

    expect(notFoundMock).toHaveBeenCalledOnce()
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('アーカイブ済みの習慣でアーカイブバッジを表示する', async () => {
    vi.mocked(getHabitById).mockResolvedValue({ ...buildHabit('user-123'), archived: true })

    render(await HabitDetailPage({ params: Promise.resolve({ id: 'habit-123' }) }))

    expect(screen.getByText('アーカイブ')).toBeInTheDocument()
  })

  it('アクティブな習慣ではアーカイブバッジを表示しない', async () => {
    vi.mocked(getHabitById).mockResolvedValue(buildHabit('user-123'))

    render(await HabitDetailPage({ params: Promise.resolve({ id: 'habit-123' }) }))

    expect(screen.queryByText('アーカイブ')).not.toBeInTheDocument()
  })
})
