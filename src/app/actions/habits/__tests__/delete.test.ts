import { Result } from '@praha/byethrow'
import { describe, expect, it, vi } from 'vitest'
import { deleteHabit, getHabitById } from '@/lib/queries/habit'
import { deleteHabitAction } from '../delete'

// Mock dependencies
vi.mock('@/lib/queries/habit', () => ({
  deleteHabit: vi.fn(),
  getHabitById: vi.fn(),
}))

vi.mock('@/lib/user', () => ({
  getCurrentUserId: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('deleteHabitAction', () => {
  const habitId = 'habit-123'
  const userId = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('認証済みユーザーが自分の習慣を削除できる', async () => {
    const { getCurrentUserId } = await import('@/lib/user')
    vi.mocked(getCurrentUserId).mockResolvedValue(userId)

    const mockHabit = {
      id: habitId,
      userId,
      name: 'Test Habit',
      archived: true,
    }
    vi.mocked(getHabitById).mockResolvedValue(mockHabit as any)
    vi.mocked(deleteHabit).mockResolvedValue(true)

    const result = await deleteHabitAction(habitId)

    expect(Result.isSuccess(result)).toBe(true)
    expect(getHabitById).toHaveBeenCalledWith(habitId)
    expect(deleteHabit).toHaveBeenCalledWith(habitId, userId)
  })

  it('未認証ユーザーはUnauthorizedErrorを取得', async () => {
    const { getCurrentUserId } = await import('@/lib/user')
    vi.mocked(getCurrentUserId).mockResolvedValue(null)

    const result = await deleteHabitAction(habitId)

    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect(result.error.name).toBe('UnauthorizedError')
    }
  })

  it('存在しない習慣の場合はNotFoundErrorを取得', async () => {
    const { getCurrentUserId } = await import('@/lib/user')
    vi.mocked(getCurrentUserId).mockResolvedValue(userId)

    vi.mocked(getHabitById).mockResolvedValue(null)

    const result = await deleteHabitAction(habitId)

    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect(result.error.name).toBe('NotFoundError')
    }
  })

  it('アーカイブされていない習慣は削除できない', async () => {
    const { getCurrentUserId } = await import('@/lib/user')
    vi.mocked(getCurrentUserId).mockResolvedValue(userId)

    const mockHabit = {
      id: habitId,
      userId,
      name: 'Test Habit',
      archived: false, // アクティブな習慣
    }
    vi.mocked(getHabitById).mockResolvedValue(mockHabit as any)

    const result = await deleteHabitAction(habitId)

    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect(result.error.name).toBe('AuthorizationError')
    }
  })
})
