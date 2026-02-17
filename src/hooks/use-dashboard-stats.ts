import { useMemo } from 'react'
import type { HabitWithProgress } from '@/types/habit'

export interface DashboardStats {
  completedHabitIds: Set<string>
  todayActive: number
  totalDaily: number
  totalStreak: number
}

export function useDashboardStats(habits: HabitWithProgress[]): DashboardStats {
  return useMemo(() => {
    const completedIds = new Set<string>()
    let dailyTotal = 0
    let dailyActive = 0
    let streakTotal = 0

    for (const habit of habits) {
      const isCompleted = habit.currentProgress >= habit.frequency
      if (isCompleted) {
        completedIds.add(habit.id)
      }

      if (habit.period === 'daily') {
        dailyTotal += 1
        // 進行中の習慣をカウント（少しでも進捗がある習慣）
        const hasProgress = habit.currentProgress > 0
        if (hasProgress) {
          dailyActive += 1
        }
      }

      streakTotal += habit.streak
    }

    return {
      completedHabitIds: completedIds,
      todayActive: dailyActive,
      totalDaily: dailyTotal,
      totalStreak: streakTotal,
    }
  }, [habits])
}
