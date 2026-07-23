import { describe, expect, it, vi } from 'vitest'
import { AuthorizationError, DatabaseError, UnauthorizedError, ValidationError } from '../habit'
import { formatSerializableError, serializeHabitError } from '../serializable'

describe('serializeHabitError', () => {
  it('UnauthorizedErrorをシリアライズ', () => {
    const error = new UnauthorizedError()
    const serialized = serializeHabitError(error)

    expect(serialized).toEqual({ name: 'UnauthorizedError' })
  })

  it('ValidationErrorをシリアライズ', () => {
    const error = new ValidationError({
      field: 'name',
      reason: 'Name is required',
    })
    const serialized = serializeHabitError(error)

    expect(serialized).toEqual({
      field: 'name',
      name: 'ValidationError',
      reason: 'Name is required',
    })
  })

  it('AuthorizationErrorをシリアライズ', () => {
    const error = new AuthorizationError({ detail: 'No access' })
    const serialized = serializeHabitError(error)

    expect(serialized).toEqual({
      message: 'No access',
      name: 'AuthorizationError',
    })
  })

  it('DatabaseErrorをシリアライズし、エラーをログ出力', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // no-op for testing
    })
    const originalError = new Error('Connection failed')
    const error = new DatabaseError({ cause: originalError })

    const serialized = serializeHabitError(error)

    expect(serialized).toEqual({
      message: 'Database operation failed',
      name: 'DatabaseError',
    })
    expect(consoleErrorSpy).toHaveBeenCalledWith('Database error:', originalError)

    consoleErrorSpy.mockRestore()
  })
})

describe('formatSerializableError', () => {
  it('UnauthorizedErrorを適切なメッセージに変換', () => {
    const error = { name: 'UnauthorizedError' as const }
    const message = formatSerializableError(error)

    expect(message).toBe('Unauthorized')
  })

  it('ValidationErrorをreasonフィールドの値に変換', () => {
    const error = {
      field: 'name',
      name: 'ValidationError' as const,
      reason: 'Name is required',
    }
    const message = formatSerializableError(error)

    expect(message).toBe('Name is required')
  })

  it('AuthorizationErrorをmessageフィールドの値に変換', () => {
    const error = {
      message: 'No access',
      name: 'AuthorizationError' as const,
    }
    const message = formatSerializableError(error)

    expect(message).toBe('No access')
  })

  it('DatabaseErrorをmessageフィールドの値に変換', () => {
    const error = {
      message: 'Database operation failed',
      name: 'DatabaseError' as const,
    }
    const message = formatSerializableError(error)

    expect(message).toBe('Database operation failed')
  })
})
