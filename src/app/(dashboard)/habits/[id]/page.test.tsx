import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getHabitById } from '@/lib/queries/habit'
import { getHabitCalendarData } from '@/lib/queries/habit-calendar'
import { getCurrentUserId } from '@/lib/user'
import type { Habit } from '@/types/habit'
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
  getCurrentUserId: vi.fn(),
}))

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
    vi.mocked(getCurrentUserId).mockResolvedValue('user-123')
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
})
