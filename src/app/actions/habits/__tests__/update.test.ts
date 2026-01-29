import { describe, expect, it, vi } from 'vitest'
import { getHabitById, updateHabit } from '@/lib/queries/habit'
import { updateHabitAction } from '../update'

// Mock dependencies
vi.mock('@/lib/queries/habit', () => ({
  getHabitById: vi.fn(),
  updateHabit: vi.fn(),
}))

vi.mock('@/lib/user', () => ({
  getCurrentUserId: vi.fn(),
}))

vi.mock('@/lib/errors/serializable', () => ({
  serializeHabitError: vi.fn((error) => error),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('updateHabitAction', () => {
  const habitId = 'habit-123'
  const userId = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('認証済みユーザーが自分の習慣を更新できる', async () => {
    const { getCurrentUserId } = await import('@/lib/user')
    vi.mocked(getCurrentUserId).mockResolvedValue(userId)

    const mockHabit = {
      id: habitId,
      userId,
      name: 'Test Habit',
    }
    vi.mocked(getHabitById).mockResolvedValue(mockHabit as any)

    const updatedHabit = {
      ...mockHabit,
      name: 'Updated Habit',
    }
    vi.mocked(updateHabit).mockResolvedValue(updatedHabit as any)

    const formData = new FormData()
    formData.append('name', 'Updated Habit')
    formData.append('icon', 'droplets')
    formData.append('color', 'orange')
    formData.append('period', 'daily')
    formData.append('frequency', '1')

    const result = await updateHabitAction(habitId, formData)

    expect(result.ok).toBe(true)
  })

  it('未認証ユーザーはUnauthorizedErrorを取得', async () => {
    const { getCurrentUserId } = await import('@/lib/user')
    vi.mocked(getCurrentUserId).mockResolvedValue(null)

    const formData = new FormData()
    formData.append('name', 'Updated Habit')

    const result = await updateHabitAction(habitId, formData)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.name).toBe('UnauthorizedError')
    }
  })

  it('存在しない習慣の場合はNotFoundErrorを取得', async () => {
    const { getCurrentUserId } = await import('@/lib/user')
    vi.mocked(getCurrentUserId).mockResolvedValue(userId)

    // バリデーションをパスする有効なデータを設定
    const formData = new FormData()
    formData.append('name', 'Updated Habit')
    formData.append('icon', 'droplets') // iconも必要
    formData.append('color', 'orange') // colorも必要
    formData.append('period', 'daily')
    formData.append('frequency', '1')

    // updateHabitがnullを返す（習慣が存在しない）
    vi.mocked(updateHabit).mockResolvedValue(null)

    const result = await updateHabitAction(habitId, formData)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.name).toBe('NotFoundError')
    }
  })

  it('無効なデータの場合はValidationErrorを取得', async () => {
    const { getCurrentUserId } = await import('@/lib/user')
    vi.mocked(getCurrentUserId).mockResolvedValue(userId)

    const mockHabit = {
      id: habitId,
      userId,
      name: 'Test Habit',
    }
    vi.mocked(getHabitById).mockResolvedValue(mockHabit as any)

    const formData = new FormData()
    formData.append('name', '') // 空文字は無効

    const result = await updateHabitAction(habitId, formData)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.name).toBe('ValidationError')
    }
  })
})
