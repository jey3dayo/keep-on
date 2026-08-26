import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { habits } from '@/db/schema'
import { GENERIC_ACTION_ERROR_MESSAGE } from '@/lib/errors/serializable'
import { getHabitById } from '@/lib/queries/habit'
import { getCurrentUserId } from '@/lib/user'
import { runHabitMutation } from '../utils'

const { captureExceptionMock } = vi.hoisted(() => ({ captureExceptionMock: vi.fn() }))

type Habit = typeof habits.$inferSelect

vi.mock('@/lib/db', () => ({
  resetDb: vi.fn(),
}))

vi.mock('@/lib/queries/habit', () => ({
  getHabitById: vi.fn(),
}))

vi.mock('@/lib/user', () => ({
  getCurrentUserId: vi.fn(),
  getUserWeekStartById: vi.fn(),
}))

vi.mock('@/lib/sentry', () => ({
  captureException: captureExceptionMock,
}))

const activeHabit: Habit = {
  archived: false,
  archivedAt: null,
  color: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  frequency: 1,
  icon: null,
  id: 'habit-123',
  name: 'テスト習慣',
  period: 'daily',
  reminderTime: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
  userId: 'user-123',
}

describe('runHabitMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCurrentUserId).mockResolvedValue('user-123')
    vi.mocked(getHabitById).mockResolvedValue(activeHabit)
  })

  it('未知例外を安全なDatabaseErrorへ変換し、元例外をSentryへ送る', async () => {
    const rawError = new Error('内部DBの機密情報')
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      const result = await runHabitMutation('habit-123', () => {
        throw rawError
      })

      expect(result).toEqual({
        error: {
          message: GENERIC_ACTION_ERROR_MESSAGE,
          name: 'DatabaseError',
        },
        ok: false,
      })
      expect(JSON.stringify(result)).not.toContain(rawError.message)
      expect(captureExceptionMock).toHaveBeenCalledWith(rawError, {
        detail: GENERIC_ACTION_ERROR_MESSAGE,
        operation: 'habit-action',
      })
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })
})
