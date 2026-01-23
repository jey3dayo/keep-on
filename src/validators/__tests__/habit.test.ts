import { Result } from '@praha/byethrow'
import { describe, expect, it } from 'vitest'
import { ValidationError } from '@/lib/errors/habit'
import { validateHabitInput } from '../habit'

describe('validateHabitInput', () => {
  const userId = 'user-123'

  it('正常な入力をSuccessとして返す', () => {
    const formData = new FormData()
    formData.append('name', '朝の運動')
    formData.append('emoji', '🏃')

    const result = validateHabitInput(userId, formData)

    expect(Result.isSuccess(result)).toBe(true)
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual({
        userId: 'user-123',
        name: '朝の運動',
        emoji: '🏃',
      })
    }
  })

  it('nameが空文字の場合はValidationErrorを返す', () => {
    const formData = new FormData()
    formData.append('name', '')

    const result = validateHabitInput(userId, formData)

    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect(result.error).toBeInstanceOf(ValidationError)
      expect(result.error.name).toBe('ValidationError')
      expect(result.error.field).toBe('name')
      expect(result.error.reason).toBe('Name is required')
    }
  })

  it('nameが100文字を超える場合はValidationErrorを返す', () => {
    const formData = new FormData()
    formData.append('name', 'a'.repeat(101))

    const result = validateHabitInput(userId, formData)

    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect(result.error).toBeInstanceOf(ValidationError)
      expect(result.error.field).toBe('name')
      expect(result.error.reason).toBe('Name is too long (max 100 characters)')
    }
  })

  it('emojiが省略された場合はnullとして扱う', () => {
    const formData = new FormData()
    formData.append('name', '朝の運動')

    const result = validateHabitInput(userId, formData)

    expect(Result.isSuccess(result)).toBe(true)
    if (Result.isSuccess(result)) {
      expect(result.value.emoji).toBeNull()
    }
  })

  it('nameの前後の空白をトリム', () => {
    const formData = new FormData()
    formData.append('name', '  朝の運動  ')

    const result = validateHabitInput(userId, formData)

    expect(Result.isSuccess(result)).toBe(true)
    if (Result.isSuccess(result)) {
      expect(result.value.name).toBe('朝の運動')
    }
  })

  it('空白のみのnameはValidationErrorを返す', () => {
    const formData = new FormData()
    formData.append('name', '   ')

    const result = validateHabitInput(userId, formData)

    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect(result.error).toBeInstanceOf(ValidationError)
      expect(result.error.field).toBe('name')
      expect(result.error.reason).toBe('Name is required')
    }
  })
})
