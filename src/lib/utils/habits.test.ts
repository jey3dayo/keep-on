import { describe, expect, it } from 'vitest'
import type { Period } from '@/constants/habit'
import { filterHabitsByPeriod, selectTodayHabits } from '@/lib/utils/habits'
import type { HabitWithProgress } from '@/types/habit'

interface Habit {
  id: string
  name: string
  period: Period
}

const habits: Habit[] = [
  { id: 'habit-1', name: '朝の運動', period: 'daily' },
  { id: 'habit-2', name: '読書', period: 'weekly' },
  { id: 'habit-3', name: '月次レビュー', period: 'monthly' },
  { id: 'habit-4', name: '散歩', period: 'daily' },
]

describe('filterHabitsByPeriod', () => {
  it('all の場合は配列をそのまま返す', () => {
    const result = filterHabitsByPeriod(habits, 'all')

    expect(result).toBe(habits)
    expect(result).toEqual(habits)
  })

  it('期間を指定すると一致する習慣のみ返す', () => {
    const result = filterHabitsByPeriod(habits, 'daily')

    expect(result).toEqual([
      { id: 'habit-1', name: '朝の運動', period: 'daily' },
      { id: 'habit-4', name: '散歩', period: 'daily' },
    ])
  })

  it('一致する習慣がない場合は空配列を返す', () => {
    const dailyOnly = habits.filter((habit) => habit.period === 'daily')
    const result = filterHabitsByPeriod(dailyOnly, 'monthly')

    expect(result).toEqual([])
  })
})

const createProgressHabit = (overrides: Partial<HabitWithProgress> = {}): HabitWithProgress => ({
  archived: false,
  archivedAt: null,
  color: null,
  completionRate: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  currentProgress: 0,
  frequency: 1,
  icon: null,
  id: 'habit',
  name: '習慣',
  period: 'daily',
  reminderTime: null,
  skippedToday: false,
  streak: 0,
  updatedAt: '2026-01-01T00:00:00.000Z',
  userId: 'user-1',
  ...overrides,
})

describe('selectTodayHabits', () => {
  it('日次は完了済みでも残す', () => {
    const habit = createProgressHabit({ currentProgress: 1, id: 'daily-done' })

    expect(selectTodayHabits([habit])).toEqual([habit])
  })

  it('週次は未達だけ残す', () => {
    const weeklyDone = createProgressHabit({ currentProgress: 2, frequency: 2, id: 'weekly-done', period: 'weekly' })
    const weeklyPending = createProgressHabit({ id: 'weekly-pending', period: 'weekly' })

    expect(selectTodayHabits([weeklyDone, weeklyPending])).toEqual([weeklyPending])
  })

  it('月次は未達だけ残す', () => {
    const monthlyDone = createProgressHabit({ currentProgress: 1, frequency: 1, id: 'monthly-done', period: 'monthly' })
    const monthlyPending = createProgressHabit({ id: 'monthly-pending', period: 'monthly' })

    expect(selectTodayHabits([monthlyDone, monthlyPending])).toEqual([monthlyPending])
  })

  it('アーカイブ済みは除外する', () => {
    const active = createProgressHabit({ id: 'active' })
    const archived = createProgressHabit({ archived: true, id: 'archived' })

    expect(selectTodayHabits([active, archived])).toEqual([active])
  })

  it('入力の順序を保つ', () => {
    const orderedHabits = [
      createProgressHabit({ id: 'daily' }),
      createProgressHabit({ id: 'weekly', period: 'weekly' }),
      createProgressHabit({ id: 'monthly', period: 'monthly' }),
    ]

    expect(selectTodayHabits(orderedHabits).map((habit) => habit.id)).toEqual(['daily', 'weekly', 'monthly'])
  })
})
