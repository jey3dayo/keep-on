import { describe, expect, it } from 'vitest'
import { safeParseUser } from './user'

describe('safeParseUser', () => {
  it('文字列の日時をDateに変換できる', () => {
    const result = safeParseUser({
      clerkId: 'clerk-123',
      createdAt: '2024-01-01T00:00:00.000Z',
      email: 'test@example.com',
      id: 'user-123',
      updatedAt: '2024-01-02T00:00:00.000Z',
      weekStart: 'monday',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output.createdAt).toBeInstanceOf(Date)
      expect(result.output.updatedAt).toBeInstanceOf(Date)
    }
  })

  it('不正な日時文字列はエラーになる', () => {
    const result = safeParseUser({
      clerkId: 'clerk-789',
      createdAt: 'invalid-date',
      email: 'invalid@example.com',
      id: 'user-789',
      updatedAt: '2024-01-02T00:00:00.000Z',
      weekStart: 'monday',
    })

    expect(result.success).toBe(false)
  })

  it('Date型の日時も許可する', () => {
    const now = new Date()
    const result = safeParseUser({
      clerkId: 'clerk-456',
      createdAt: now,
      email: 'test2@example.com',
      id: 'user-456',
      updatedAt: now,
      weekStart: 'sunday',
    })

    expect(result.success).toBe(true)
  })
})
