import { beforeEach, describe, expect, it, vi } from 'vitest'
import { upsertUser } from '../user'

// Drizzle ORMのモック
vi.mock('@/lib/db', () => ({
  getDb: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
    returning: vi.fn().mockResolvedValue([]),
    select: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  }),
}))

import { getDb } from '@/lib/db'

describe('upsertUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('新規ユーザーを作成する', async () => {
    const mockUser = {
      clerkId: 'clerk-123',
      createdAt: new Date(),
      email: 'test@example.com',
      id: 'user-123',
      updatedAt: new Date(),
    }

    const db = getDb()
    vi.mocked(db.returning).mockResolvedValueOnce([mockUser])

    const result = await upsertUser({
      clerkId: 'clerk-123',
      email: 'test@example.com',
    })

    expect(result).toEqual(mockUser)
    expect(db.insert).toHaveBeenCalled()
    expect(db.values).toHaveBeenCalled()
    expect(db.onConflictDoUpdate).toHaveBeenCalled()
    expect(db.returning).toHaveBeenCalled()
  })

  it('既存ユーザーを更新する', async () => {
    const mockUser = {
      clerkId: 'clerk-123',
      createdAt: new Date('2024-01-01'),
      email: 'updated@example.com',
      id: 'user-123',
      updatedAt: new Date(),
    }

    const db = getDb()
    vi.mocked(db.returning).mockResolvedValueOnce([mockUser])

    const result = await upsertUser({
      clerkId: 'clerk-123',
      email: 'updated@example.com',
    })

    expect(result).toEqual(mockUser)
    expect(result.email).toBe('updated@example.com')
  })

  it('正しいメソッドチェーンでDB操作が呼ばれる', async () => {
    const mockUser = {
      clerkId: 'clerk-456',
      createdAt: new Date(),
      email: 'another@example.com',
      id: 'user-456',
      updatedAt: new Date(),
    }

    const db = getDb()
    vi.mocked(db.returning).mockResolvedValueOnce([mockUser])

    await upsertUser({
      clerkId: 'clerk-456',
      email: 'another@example.com',
    })

    expect(db.insert).toHaveBeenCalledTimes(1)
    expect(db.values).toHaveBeenCalled()
    expect(db.onConflictDoUpdate).toHaveBeenCalled()
    expect(db.returning).toHaveBeenCalled()
  })
})
