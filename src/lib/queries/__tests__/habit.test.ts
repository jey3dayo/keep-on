import type { InferSelectModel } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { habits } from '@/db/schema'
import { getHabitById, getHabitsByUserId } from '../habit'

type Habit = InferSelectModel<typeof habits>

// Drizzle ORMのモック
vi.mock('@/lib/db', () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
  }),
}))

import { getDb } from '@/lib/db'

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
    const db = await getDb()
    vi.mocked(db.orderBy).mockResolvedValueOnce(mockHabits)

    const result = await getHabitsByUserId('user-123')

    expect(result).toEqual(mockHabits)
    expect(db.select).toHaveBeenCalled()
    expect(db.from).toHaveBeenCalled()
    expect(db.where).toHaveBeenCalled()
    expect(db.orderBy).toHaveBeenCalled()
  })

  it('該当する習慣がない場合は空配列を返す', async () => {
    const db = await getDb()
    vi.mocked(db.orderBy).mockResolvedValueOnce([])

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
    const db = await getDb()
    vi.mocked(db.where).mockResolvedValueOnce([mockHabit])

    const result = await getHabitById('habit-1')

    expect(result).toEqual(mockHabit)
    expect(db.select).toHaveBeenCalled()
    expect(db.from).toHaveBeenCalled()
    expect(db.where).toHaveBeenCalled()
  })

  it('該当する習慣がない場合はnullを返す', async () => {
    const db = await getDb()
    vi.mocked(db.where).mockResolvedValueOnce([])

    const result = await getHabitById('non-existent')

    expect(result).toBeNull()
  })
})
