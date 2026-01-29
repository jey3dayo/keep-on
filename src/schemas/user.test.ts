import { describe, expect, it } from 'vitest'
import { safeParseUser } from './user'

describe('safeParseUser', () => {
  it('文字列の日時をDateに変換できる', () => {
    const result = safeParseUser({
      id: 'user-123',
      clerkId: 'clerk-123',
      email: 'test@example.com',
      weekStart: 'monday',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output.createdAt).toBeInstanceOf(Date)
      expect(result.output.updatedAt).toBeInstanceOf(Date)
    }
  })

  it('不正な日時文字列はエラーになる', () => {
    const result = safeParseUser({
      id: 'user-789',
      clerkId: 'clerk-789',
      email: 'invalid@example.com',
      weekStart: 'monday',
      createdAt: 'invalid-date',
      updatedAt: '2024-01-02T00:00:00.000Z',
    })

    expect(result.success).toBe(false)
  })

  it('Date型の日時も許可する', () => {
    const now = new Date()
    const result = safeParseUser({
      id: 'user-456',
      clerkId: 'clerk-456',
      email: 'test2@example.com',
      weekStart: 'sunday',
      createdAt: now,
      updatedAt: now,
    })

    expect(result.success).toBe(true)
  })
})
