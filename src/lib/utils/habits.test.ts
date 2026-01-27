import { describe, expect, it } from 'vitest'
import type { Period } from '@/constants/habit'
import { filterHabitsByPeriod } from '@/lib/utils/habits'

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
