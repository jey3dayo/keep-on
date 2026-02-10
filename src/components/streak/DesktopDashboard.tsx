'use client'

import { useMemo, useState } from 'react'
import type { Period } from '@/constants/habit'
import { useDashboardStats } from '@/hooks/use-dashboard-stats'
import { usePresetSelection } from '@/hooks/use-preset-selection'
import { filterHabitsByPeriod } from '@/lib/utils/habits'
import type { User } from '@/types/user'
import { HabitForm } from './HabitForm'
import { HabitListView } from './HabitListView'
import { HabitPresetSelector } from './HabitPresetSelector'
import type { DashboardBaseProps } from './types'

interface DesktopDashboardProps extends DashboardBaseProps {
  user: User
}

type PeriodFilter = 'all' | Period
type View = 'dashboard' | 'preset-selector' | 'add'

export function DesktopDashboard({
  habits,
  pendingCheckins,
  onAddHabit,
  onAddCheckin,
  onRemoveCheckin,
  onArchiveOptimistic,
  onDeleteOptimistic,
  onResetOptimistic,
  todayLabel,
}: DesktopDashboardProps) {
  const [currentView, setCurrentView] = useState<View>('dashboard')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')

  const { selectedPreset, selectPreset, clearPreset } = usePresetSelection()
  const { completedHabitIds, todayCompleted, totalDaily, totalStreak } = useDashboardStats(habits)

  const filteredHabits = useMemo(() => filterHabitsByPeriod(habits, periodFilter), [habits, periodFilter])

  if (currentView === 'preset-selector') {
    return (
      <div className="space-y-6 p-6">
        <HabitPresetSelector
          onClose={() => {
            clearPreset()
            setCurrentView('dashboard')
          }}
          onCreateCustom={() => {
            clearPreset()
            setCurrentView('add')
          }}
          onSelectPreset={(preset) => {
            selectPreset(preset)
            setCurrentView('add')
          }}
        />
      </div>
    )
  }

  if (currentView === 'add') {
    return (
      <HabitForm
        onBack={() => setCurrentView('preset-selector')}
        onSubmit={async (input) => {
          await onAddHabit(input.name, input.icon, {
            color: input.color,
            period: input.period,
            frequency: input.frequency,
          })
          clearPreset()
          setCurrentView('dashboard')
        }}
        preset={selectedPreset}
      />
    )
  }

  return (
    <div className="space-y-6 p-6">
      <HabitListView
        completedHabitIds={completedHabitIds}
        filteredHabits={filteredHabits}
        habits={habits}
        onAddCheckin={onAddCheckin}
        onAddHabit={() => setCurrentView('preset-selector')}
        onArchiveOptimistic={onArchiveOptimistic}
        onDeleteOptimistic={onDeleteOptimistic}
        onPeriodChange={setPeriodFilter}
        onRemoveCheckin={onRemoveCheckin}
        onResetOptimistic={onResetOptimistic}
        pendingCheckins={pendingCheckins}
        periodFilter={periodFilter}
        todayCompleted={todayCompleted}
        todayLabel={todayLabel}
        totalDaily={totalDaily}
        totalStreak={totalStreak}
      />
    </div>
  )
}
