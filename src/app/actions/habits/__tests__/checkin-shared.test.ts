import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { habits } from '@/db/schema'
import { AuthorizationError, getHabitAuthorizationClientMessage } from '@/lib/errors/habit'
import { getHabitById } from '@/lib/queries/habit'
import { requireHabitForUserWithRetry } from '../checkin-shared'

vi.mock('@/lib/queries/habit', () => ({
  getHabitById: vi.fn(),
}))

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

describe('requireHabitForUserWithRetry', () => {
  const habitId = 'habit-123'
  const userId = 'user-123'
  const runWithRetry = async <T>(_name: string, fn: () => Promise<T>) => await fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('未アーカイブかつ所有者一致の場合はhabitを返す', async () => {
    const mockHabit = buildHabit({ id: habitId, userId })
    vi.mocked(getHabitById).mockResolvedValue(mockHabit)

    const habit = await requireHabitForUserWithRetry({
      actionName: 'action.habits.checkin',
      habitId,
      meta: {},
      runWithRetry,
      userId,
    })

    expect(habit).toEqual(mockHabit)
  })

  it('存在しない場合はAuthorizationErrorを投げる', async () => {
    vi.mocked(getHabitById).mockResolvedValue(null)

    await expect(
      requireHabitForUserWithRetry({
        actionName: 'action.habits.checkin',
        habitId,
        meta: {},
        runWithRetry,
        userId,
      })
    ).rejects.toMatchObject({
      message: getHabitAuthorizationClientMessage(),
      name: 'AuthorizationError',
    })
  })

  it('他ユーザーの習慣の場合はAuthorizationErrorを投げる', async () => {
    vi.mocked(getHabitById).mockResolvedValue(buildHabit({ id: habitId, userId: 'other-user' }))

    await expect(
      requireHabitForUserWithRetry({
        actionName: 'action.habits.checkin',
        habitId,
        meta: {},
        runWithRetry,
        userId,
      })
    ).rejects.toMatchObject({
      message: getHabitAuthorizationClientMessage(),
      name: 'AuthorizationError',
    })
  })

  it('アーカイブ済みの場合はAuthorizationErrorを投げる', async () => {
    vi.mocked(getHabitById).mockResolvedValue(buildHabit({ archived: true, id: habitId, userId }))

    await expect(
      requireHabitForUserWithRetry({
        actionName: 'action.habits.checkin',
        habitId,
        meta: {},
        runWithRetry,
        userId,
      })
    ).rejects.toMatchObject({
      message: getHabitAuthorizationClientMessage(),
      name: 'AuthorizationError',
    })
  })

  it('missing / other-owner / archived は同一のクライアント向けエラーになる', async () => {
    const cases: Array<Habit | null> = [
      null,
      buildHabit({ id: habitId, userId: 'other-user' }),
      buildHabit({ archived: true, id: habitId, userId }),
    ]

    const errors: Array<{ message: string; name: string }> = []
    for (const habit of cases) {
      vi.mocked(getHabitById).mockResolvedValue(habit)
      try {
        await requireHabitForUserWithRetry({
          actionName: 'action.habits.checkin',
          habitId,
          meta: {},
          runWithRetry,
          userId,
        })
        throw new Error('expected AuthorizationError')
      } catch (error) {
        expect(error).toBeInstanceOf(AuthorizationError)
        if (error instanceof AuthorizationError) {
          errors.push({
            message: error.message,
            name: error.name,
          })
        }
      }
    }

    const expected = {
      message: getHabitAuthorizationClientMessage(),
      name: 'AuthorizationError',
    }
    expect(errors).toEqual([expected, expected, expected])
  })
})
