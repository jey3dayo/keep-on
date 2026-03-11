'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { useDashboardStats } from '@/hooks/use-dashboard-stats'
import { filterHabitsByPeriod } from '@/lib/utils/habits'
import type { HabitWithProgress } from '@/types/habit'
import type { DashboardPeriodFilter } from './types'

export function useDashboardContent(habits: HabitWithProgress[]) {
  const router = useRouter()
  const [periodFilter, setPeriodFilter] = useState<DashboardPeriodFilter>('all')

  const { completedHabitIds, todayActive, totalDaily, totalStreak } = useDashboardStats(habits)

  const filteredHabits = useMemo(() => filterHabitsByPeriod(habits, periodFilter), [habits, periodFilter])

  const handleAddHabit = useCallback(() => {
    router.push('/habits/new?step=preset')
  }, [router])

  return {
    completedHabitIds,
    filteredHabits,
    handleAddHabit,
    periodFilter,
    setPeriodFilter,
    todayActive,
    totalDaily,
    totalStreak,
  }
}
