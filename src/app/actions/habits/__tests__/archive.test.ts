import { Result } from '@praha/byethrow'
import { describe, expect, it, vi } from 'vitest'
import { archiveHabit, getHabitById } from '@/lib/queries/habit'
import { archiveHabitAction } from '../archive'

// Mock dependencies
vi.mock('@/lib/queries/habit', () => ({
  archiveHabit: vi.fn(),
  getHabitById: vi.fn(),
}))

vi.mock('@/lib/user', () => ({
  getCurrentUserId: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('archiveHabitAction', () => {
  const habitId = 'habit-123'
  const userId = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('認証済みユーザーが自分の習慣をアーカイブできる', async () => {
    const { getCurrentUserId } = await import('@/lib/user')
    vi.mocked(getCurrentUserId).mockResolvedValue(userId)

    const mockHabit = {
      id: habitId,
      userId,
      name: 'Test Habit',
      archived: false,
    }
    vi.mocked(getHabitById).mockResolvedValue(mockHabit as any)
    vi.mocked(archiveHabit).mockResolvedValue(true)

    const result = await archiveHabitAction(habitId)

    expect(Result.isSuccess(result)).toBe(true)
    expect(getHabitById).toHaveBeenCalledWith(habitId)
    expect(archiveHabit).toHaveBeenCalledWith(habitId, userId)
  })

  it('未認証ユーザーはUnauthorizedErrorを取得', async () => {
    const { getCurrentUserId } = await import('@/lib/user')
    vi.mocked(getCurrentUserId).mockResolvedValue(null)

    const result = await archiveHabitAction(habitId)

    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect(result.error.name).toBe('UnauthorizedError')
    }
  })

  it('存在しない習慣の場合はNotFoundErrorを取得', async () => {
    const { getCurrentUserId } = await import('@/lib/user')
    vi.mocked(getCurrentUserId).mockResolvedValue(userId)

    vi.mocked(getHabitById).mockResolvedValue(null)

    const result = await archiveHabitAction(habitId)

    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect(result.error.name).toBe('NotFoundError')
    }
  })

  it('他のユーザーの習慣をアーカイブしようとするとAuthorizationErrorを取得', async () => {
    const { getCurrentUserId } = await import('@/lib/user')
    const otherUserId = 'other-user-456'
    vi.mocked(getCurrentUserId).mockResolvedValue(otherUserId)

    const mockHabit = {
      id: habitId,
      userId,
      name: 'Test Habit',
      archived: false,
    }
    vi.mocked(getHabitById).mockResolvedValue(mockHabit as any)
    vi.mocked(archiveHabit).mockResolvedValue(false)

    const result = await archiveHabitAction(habitId)

    expect(Result.isFailure(result)).toBe(true)
  })
})
