import type { Period } from '@/constants/habit'

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
