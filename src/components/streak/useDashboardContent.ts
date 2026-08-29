'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { useDashboardStats } from '@/hooks/use-dashboard-stats'
import type { HabitWithProgress } from '@/types/habit'

export function useDashboardContent(habits: HabitWithProgress[]) {
  const router = useRouter()

  const { completedHabitIds, todayActive, totalDaily } = useDashboardStats(habits)

  const handleAddHabit = useCallback(() => {
    router.push('/habits/new?step=preset')
  }, [router])

  return {
    completedHabitIds,
    handleAddHabit,
    todayActive,
    totalDaily,
  }
}
