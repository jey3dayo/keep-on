import { useMemo } from 'react'
import type { HabitWithProgress } from '@/types/habit'

export interface DashboardStats {
  completedHabitIds: Set<string>
  todayCompleted: number
  totalDaily: number
  totalStreak: number
}

export function useDashboardStats(habits: HabitWithProgress[]): DashboardStats {
  return useMemo(() => {
    const completedIds = new Set<string>()
    let dailyTotal = 0
    let dailyCompleted = 0
    let streakTotal = 0

    for (const habit of habits) {
      const isCompleted = habit.currentProgress >= habit.frequency
      if (isCompleted) {
        completedIds.add(habit.id)
      }

      if (habit.period === 'daily') {
        dailyTotal += 1
        if (isCompleted) {
          dailyCompleted += 1
        }
      }

      streakTotal += habit.streak
    }

    return {
      completedHabitIds: completedIds,
      todayCompleted: dailyCompleted,
      totalDaily: dailyTotal,
      totalStreak: streakTotal,
    }
  }, [habits])
}
