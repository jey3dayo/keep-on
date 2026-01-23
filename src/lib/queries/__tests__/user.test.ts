import { beforeEach, describe, expect, it, vi } from 'vitest'

// prisma のモック（importより前に定義）
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      upsert: vi.fn(),
    },
  },
}))

// モック後にimport
import { prisma } from '@/lib/db'
import { upsertUser } from '../user'

describe('upsertUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('新規ユーザーを作成する', async () => {
    const mockUser = {
      id: 'user-123',
      clerkId: 'clerk-123',
      email: 'test@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(prisma.user.upsert).mockResolvedValue(mockUser)

    const result = await upsertUser({
      clerkId: 'clerk-123',
      email: 'test@example.com',
    })

    expect(result).toEqual(mockUser)
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { clerkId: 'clerk-123' },
      update: {
        email: 'test@example.com',
        updatedAt: expect.any(Date),
      },
      create: {
        clerkId: 'clerk-123',
        email: 'test@example.com',
      },
    })
  })

  it('既存ユーザーを更新する', async () => {
    const mockUser = {
      id: 'user-123',
      clerkId: 'clerk-123',
      email: 'updated@example.com',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
    }

    vi.mocked(prisma.user.upsert).mockResolvedValue(mockUser)

    const result = await upsertUser({
      clerkId: 'clerk-123',
      email: 'updated@example.com',
    })

    expect(result).toEqual(mockUser)
    expect(result.email).toBe('updated@example.com')
  })

  it('正しい引数でprisma.user.upsertが呼ばれる', async () => {
    const mockUser = {
      id: 'user-456',
      clerkId: 'clerk-456',
      email: 'another@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(prisma.user.upsert).mockResolvedValue(mockUser)

    await upsertUser({
      clerkId: 'clerk-456',
      email: 'another@example.com',
    })

    expect(prisma.user.upsert).toHaveBeenCalledTimes(1)
    const callArgs = vi.mocked(prisma.user.upsert).mock.calls[0][0]

    expect(callArgs.where).toEqual({ clerkId: 'clerk-456' })
    expect(callArgs.update).toMatchObject({
      email: 'another@example.com',
    })
    expect(callArgs.create).toEqual({
      clerkId: 'clerk-456',
      email: 'another@example.com',
    })
  })
})
