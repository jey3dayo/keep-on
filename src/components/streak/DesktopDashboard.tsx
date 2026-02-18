'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import type { Period } from '@/constants/habit'
import { useDashboardStats } from '@/hooks/use-dashboard-stats'
import { filterHabitsByPeriod } from '@/lib/utils/habits'
import type { User } from '@/types/user'
import { HabitListView } from './HabitListView'
import type { DashboardBaseProps } from './types'

interface DesktopDashboardProps extends DashboardBaseProps {
  user: User
}

type PeriodFilter = 'all' | Period

export function DesktopDashboard({
  habits,
  onAddCheckin,
  onRemoveCheckin,
  onArchiveOptimistic,
  onDeleteOptimistic,
  onResetOptimistic,
  todayLabel,
}: DesktopDashboardProps) {
  const router = useRouter()
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')

  const { completedHabitIds, todayActive, totalDaily, totalStreak } = useDashboardStats(habits)

  const filteredHabits = useMemo(() => filterHabitsByPeriod(habits, periodFilter), [habits, periodFilter])

  return (
    <div className="space-y-6 p-6">
      <HabitListView
        completedHabitIds={completedHabitIds}
        filteredHabits={filteredHabits}
        habits={habits}
        onAddCheckin={onAddCheckin}
        onAddHabit={() => router.push('/habits/new?step=preset')}
        onArchiveOptimistic={onArchiveOptimistic}
        onDeleteOptimistic={onDeleteOptimistic}
        onPeriodChange={setPeriodFilter}
        onRemoveCheckin={onRemoveCheckin}
        onResetOptimistic={onResetOptimistic}
        periodFilter={periodFilter}
        todayActive={todayActive}
        todayLabel={todayLabel}
        totalDaily={totalDaily}
        totalStreak={totalStreak}
      />
    </div>
  )
}
