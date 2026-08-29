import type { Period } from '@/constants/habit'
import type { HabitWithProgress } from '@/types/habit'

/**
 * 習慣を期間でフィルタリング
 *
 * @param habits - フィルタリング対象の習慣配列
 * @param periodFilter - フィルター条件（'all' | Period）
 * @returns フィルタリングされた習慣配列
 */
export function filterHabitsByPeriod<T extends { period: Period }>(habits: T[], periodFilter: 'all' | Period): T[] {
  return periodFilter === 'all' ? habits : habits.filter((h) => h.period === periodFilter)
}

export function selectTodayHabits(habits: HabitWithProgress[]): HabitWithProgress[] {
  return habits.filter((habit) => {
    if (habit.archived) {
      return false
    }
    if (habit.period === 'daily') {
      return true
    }
    return habit.currentProgress < habit.frequency
  })
}

const PERIOD_LABELS: Record<Period, string> = {
  daily: '毎日',
  monthly: '毎月',
  weekly: '毎週',
}

export function getPeriodLabel(period: Period): string {
  return PERIOD_LABELS[period] ?? period
}
