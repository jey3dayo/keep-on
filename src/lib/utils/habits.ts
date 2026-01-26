import type { TaskPeriod } from '../habit-data'

/**
 * 習慣を期間でフィルタリング
 *
 * @param habits - フィルタリング対象の習慣配列
 * @param periodFilter - フィルター条件（'all' | TaskPeriod）
 * @returns フィルタリングされた習慣配列
 */
export function filterHabitsByPeriod<T extends { period: TaskPeriod }>(
  habits: T[],
  periodFilter: 'all' | TaskPeriod
): T[] {
  return periodFilter === 'all' ? habits : habits.filter((h) => h.period === periodFilter)
}
