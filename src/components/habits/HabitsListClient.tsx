'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { useDashboardStats } from '@/hooks/use-dashboard-stats'
import { useHabitCheckinQueue } from '@/hooks/useHabitCheckinQueue'
import type { HabitWithProgress } from '@/types/habit'
import { HabitListView } from './HabitListView'
import type { HabitsPeriodFilter } from './types'

interface HabitsListClientProps {
  habits: HabitWithProgress[]
  todayLabel: string
}

export function HabitsListClient({ habits, todayLabel }: HabitsListClientProps) {
  const router = useRouter()
  const [periodFilter, setPeriodFilter] = useState<HabitsPeriodFilter>('all')
  const {
    archiveOptimistically,
    deleteOptimistically,
    handleAddCheckin,
    handleRemoveCheckin,
    handleSkip,
    handleUnSkip,
    optimisticHabits,
    resetOptimistically,
  } = useHabitCheckinQueue(habits)

  const activeHabits = useMemo(() => optimisticHabits.filter((habit) => !habit.archived), [optimisticHabits])
  const archivedHabits = useMemo(
    () =>
      optimisticHabits
        .filter((habit) => habit.archived)
        .sort((a, b) => {
          const aTime = a.archivedAt ? new Date(a.archivedAt).getTime() : 0
          const bTime = b.archivedAt ? new Date(b.archivedAt).getTime() : 0
          return bTime - aTime
        }),
    [optimisticHabits]
  )
  const filteredHabits = useMemo(() => {
    // 「すべて」はアーカイブ済みを含む全件ではなく、アクティブな習慣だけを指す。
    if (periodFilter === 'all') {
      return activeHabits
    }
    if (periodFilter === 'archived') {
      return archivedHabits
    }
    return activeHabits.filter((habit) => habit.period === periodFilter)
  }, [activeHabits, archivedHabits, periodFilter])
  const { completedHabitIds, todayActive, totalDaily, totalStreak } = useDashboardStats(activeHabits)

  const handleAddHabit = useCallback(() => {
    router.push('/habits/new?step=preset')
  }, [router])

  return (
    <HabitListView
      completedHabitIds={completedHabitIds}
      filteredHabits={filteredHabits}
      habits={optimisticHabits}
      onAddCheckin={handleAddCheckin}
      onAddHabit={handleAddHabit}
      onArchiveOptimistic={archiveOptimistically}
      onDeleteOptimistic={deleteOptimistically}
      onPeriodChange={setPeriodFilter}
      onRemoveCheckin={handleRemoveCheckin}
      onResetOptimistic={resetOptimistically}
      onSkip={handleSkip}
      onUnSkip={handleUnSkip}
      periodFilter={periodFilter}
      todayActive={todayActive}
      todayLabel={todayLabel}
      totalDaily={totalDaily}
      totalStreak={totalStreak}
    />
  )
}
