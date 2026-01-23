import { describe, expect, it, vi } from 'vitest'
import { DatabaseError, UnauthorizedError, ValidationError } from '../habit'
import { formatErrorMessage } from '../handlers'

describe('formatErrorMessage', () => {
  it('UnauthorizedErrorを適切なメッセージに変換', () => {
    const error = new UnauthorizedError()
    const message = formatErrorMessage(error)
    expect(message).toBe('Unauthorized')
  })

  it('ValidationErrorをreasonフィールドの値に変換', () => {
    const error = new ValidationError({
      field: 'name',
      reason: 'Name is required',
    })
    const message = formatErrorMessage(error)
    expect(message).toBe('Name is required')
  })

  it('DatabaseErrorを汎用メッセージに変換し、エラーをログ出力', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // no-op for testing
    })
    const originalError = new Error('Connection failed')
    const error = new DatabaseError({ cause: originalError })

    const message = formatErrorMessage(error)

    expect(message).toBe('Database operation failed')
    expect(consoleErrorSpy).toHaveBeenCalledWith('Database error:', originalError)

    consoleErrorSpy.mockRestore()
  })

  it('DatabaseError with contextを適切にログ出力', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // no-op for testing
    })
    const originalError = new Error('Connection failed')
    const error = new DatabaseError({ cause: originalError })

    const message = formatErrorMessage(error, 'Failed to create habit')

    expect(message).toBe('Database operation failed')
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create habit:', originalError)

    consoleErrorSpy.mockRestore()
  })
})
