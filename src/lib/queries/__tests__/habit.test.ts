import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Habit } from '@prisma/client'
import { getHabitById, getHabitsByUserId } from '../habit'

// Prismaのモック
vi.mock('@/lib/db', () => ({
  prisma: {
    habit: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

// モックされたprismaをインポート
import { prisma } from '@/lib/db'

describe('getHabitsByUserId', () => {
  const mockHabits: Habit[] = [
    {
      id: 'habit-1',
      userId: 'user-123',
      name: '朝の運動',
      emoji: '🏃',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'habit-2',
      userId: 'user-123',
      name: '読書',
      emoji: '📚',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ユーザーIDで習慣一覧を取得', async () => {
    vi.mocked(prisma.habit.findMany).mockResolvedValue(mockHabits)

    const result = await getHabitsByUserId('user-123')

    expect(result).toEqual(mockHabits)
    expect(prisma.habit.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      orderBy: { createdAt: 'desc' },
    })
  })

  it('該当する習慣がない場合は空配列を返す', async () => {
    vi.mocked(prisma.habit.findMany).mockResolvedValue([])

    const result = await getHabitsByUserId('user-456')

    expect(result).toEqual([])
  })
})

describe('getHabitById', () => {
  const mockHabit: Habit = {
    id: 'habit-1',
    userId: 'user-123',
    name: '朝の運動',
    emoji: '🏃',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('IDで習慣を取得', async () => {
    vi.mocked(prisma.habit.findUnique).mockResolvedValue(mockHabit)

    const result = await getHabitById('habit-1')

    expect(result).toEqual(mockHabit)
    expect(prisma.habit.findUnique).toHaveBeenCalledWith({
      where: { id: 'habit-1' },
    })
  })

  it('該当する習慣がない場合はnullを返す', async () => {
    vi.mocked(prisma.habit.findUnique).mockResolvedValue(null)

    const result = await getHabitById('non-existent')

    expect(result).toBeNull()
  })
})
