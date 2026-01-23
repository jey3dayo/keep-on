import { describe, expect, it, vi } from 'vitest'
import { DatabaseError, UnauthorizedError, ValidationError } from '../habit'
import { serializeHabitError } from '../serializable'

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
      name: 'ValidationError',
      field: 'name',
      reason: 'Name is required',
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
      name: 'DatabaseError',
      message: 'Database operation failed',
    })
    expect(consoleErrorSpy).toHaveBeenCalledWith('Database error:', originalError)

    consoleErrorSpy.mockRestore()
  })
})
