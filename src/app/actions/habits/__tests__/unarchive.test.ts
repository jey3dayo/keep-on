import { describe, expect, it, vi } from 'vitest'
import { getHabitById, unarchiveHabit } from '@/lib/queries/habit'
import { unarchiveHabitAction } from '../unarchive'

// Mock dependencies
vi.mock('@/lib/queries/habit', () => ({
  getHabitById: vi.fn(),
  unarchiveHabit: vi.fn(),
}))

vi.mock('@/lib/user', () => ({
  getCurrentUserId: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('unarchiveHabitAction', () => {
  const habitId = 'habit-123'
  const userId = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('認証済みユーザーが自分のアーカイブ済み習慣を復元できる', async () => {
    const { getCurrentUserId } = await import('@/lib/user')
    vi.mocked(getCurrentUserId).mockResolvedValue(userId)

    const mockHabit = {
      id: habitId,
      userId,
      name: 'Test Habit',
      archived: true,
    }
    vi.mocked(getHabitById).mockResolvedValue(mockHabit as any)
    vi.mocked(unarchiveHabit).mockResolvedValue(true)

    const result = await unarchiveHabitAction(habitId)

    expect(result.ok).toBe(true)
    expect(getHabitById).toHaveBeenCalledWith(habitId)
    expect(unarchiveHabit).toHaveBeenCalledWith(habitId, userId)
  })

  it('未認証ユーザーはUnauthorizedErrorを取得', async () => {
    const { getCurrentUserId } = await import('@/lib/user')
    vi.mocked(getCurrentUserId).mockResolvedValue(null)

    const result = await unarchiveHabitAction(habitId)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.name).toBe('UnauthorizedError')
    }
  })

  it('存在しない習慣の場合はNotFoundErrorを取得', async () => {
    const { getCurrentUserId } = await import('@/lib/user')
    vi.mocked(getCurrentUserId).mockResolvedValue(userId)

    vi.mocked(getHabitById).mockResolvedValue(null)

    const result = await unarchiveHabitAction(habitId)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.name).toBe('NotFoundError')
    }
  })
})
