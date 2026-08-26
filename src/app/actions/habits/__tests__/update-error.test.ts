import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GENERIC_ACTION_ERROR_MESSAGE } from '@/lib/errors/serializable'
import { updateHabit } from '@/lib/queries/habit'
import { getCurrentUserId } from '@/lib/user'
import { updateHabitAction } from '../update'

const { captureExceptionMock } = vi.hoisted(() => ({ captureExceptionMock: vi.fn() }))

vi.mock('@/lib/db', () => ({
  resetDb: vi.fn(),
}))

vi.mock('@/lib/queries/habit', () => ({
  getHabitById: vi.fn(),
  updateHabit: vi.fn(),
}))

vi.mock('@/lib/user', () => ({
  getCurrentUserId: vi.fn(),
  getUserWeekStartById: vi.fn(),
}))

vi.mock('@/lib/sentry', () => ({
  captureException: captureExceptionMock,
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

function buildFormData(): FormData {
  const formData = new FormData()
  formData.append('name', 'Updated Habit')
  formData.append('icon', 'droplets')
  formData.append('color', 'orange')
  formData.append('period', 'daily')
  formData.append('frequency', '1')
  return formData
}

describe('updateHabitAction error boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCurrentUserId).mockResolvedValue('user-123')
  })

  it('未知例外を画面へ漏らさず、元例外をSentryへ送る', async () => {
    const rawError = new Error('内部DBの機密情報')
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(updateHabit).mockRejectedValue(rawError)

    try {
      const result = await updateHabitAction('habit-123', buildFormData())

      expect(result).toEqual({
        error: {
          message: GENERIC_ACTION_ERROR_MESSAGE,
          name: 'DatabaseError',
        },
        ok: false,
      })
      expect(JSON.stringify(result)).not.toContain(rawError.message)
      expect(captureExceptionMock).toHaveBeenCalledWith(rawError, {
        detail: '習慣の更新に失敗しました',
        operation: 'habit-action',
      })
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })
})
