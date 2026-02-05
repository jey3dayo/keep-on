'use client'

import { useMemo, useState } from 'react'
import type { IconName } from '@/components/basics/Icon'
import type { Period } from '@/constants/habit'
import type { HabitPreset } from '@/constants/habit-data'
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
  onToggleCheckin,
  onAddCheckin,
  onRemoveCheckin,
  onArchiveOptimistic,
  onDeleteOptimistic,
  onResetOptimistic,
  todayLabel,
}: DesktopDashboardProps) {
  const [currentView, setCurrentView] = useState<View>('dashboard')
  const [selectedPreset, setSelectedPreset] = useState<HabitPreset | null>(null)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')

  const { completedHabitIds, todayCompleted, totalDaily, totalStreak } = useMemo(() => {
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

  const filteredHabits = useMemo(() => filterHabitsByPeriod(habits, periodFilter), [habits, periodFilter])

  const handleAddHabit = async (
    name: string,
    icon: IconName,
    options?: { color?: string | null; period?: Period; frequency?: number }
  ) => {
    await onAddHabit(name, icon, options)
  }

  const handleToggleHabit = async (habitId: string) => {
    await onToggleCheckin(habitId)
  }

  if (currentView === 'preset-selector') {
    return (
      <div className="space-y-6 p-6">
        <HabitPresetSelector
          onClose={() => {
            setSelectedPreset(null)
            setCurrentView('dashboard')
          }}
          onCreateCustom={() => {
            setSelectedPreset(null)
            setCurrentView('add')
          }}
          onSelectPreset={(preset: HabitPreset) => {
            setSelectedPreset(preset)
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
          await handleAddHabit(input.name, input.icon, {
            color: input.color,
            period: input.period,
            frequency: input.frequency,
          })
          setSelectedPreset(null)
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
        onToggleHabit={handleToggleHabit}
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
