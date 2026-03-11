'use client'

import { useEffect } from 'react'
import { DashboardViewToggle } from './DashboardViewToggle'
import { HabitListView } from './HabitListView'
import { HabitSimpleView } from './HabitSimpleView'
import type { DashboardViewProps } from './types'
import { useDashboardContent } from './useDashboardContent'

export function StreakDashboard({
  habits,
  onAddCheckin,
  onRemoveCheckin,
  onArchiveOptimistic,
  onDeleteOptimistic,
  onResetOptimistic,
  onSkip,
  onUnSkip,
  todayLabel,
  currentView,
  onViewChange,
}: DashboardViewProps) {
  const {
    completedHabitIds,
    filteredHabits,
    handleAddHabit,
    periodFilter,
    setPeriodFilter,
    todayActive,
    totalDaily,
    totalStreak,
  } = useDashboardContent(habits)

  useEffect(() => {
    const root = document.documentElement
    const shouldApply = currentView === 'dashboard' || currentView === 'simple'

    if (shouldApply) {
      root.style.setProperty('--dashboard-bg', 'var(--primary)')
    } else {
      root.style.removeProperty('--dashboard-bg')
    }

    return () => {
      root.style.removeProperty('--dashboard-bg')
    }
  }, [currentView])

  return (
    <>
      {currentView === 'simple' ? (
        <HabitSimpleView
          backgroundColor="var(--primary)"
          completedHabitIds={completedHabitIds}
          habits={habits}
          onAddCheckin={onAddCheckin}
          onAddHabit={handleAddHabit}
          onArchiveOptimistic={onArchiveOptimistic}
          onDeleteOptimistic={onDeleteOptimistic}
          onRemoveCheckin={onRemoveCheckin}
          onResetOptimistic={onResetOptimistic}
          onSettings={() => onViewChange('dashboard')}
        />
      ) : (
        <div className="streak-bg flex min-h-full flex-col" style={{ backgroundColor: 'var(--primary)' }}>
          <HabitListView
            completedHabitIds={completedHabitIds}
            filteredHabits={filteredHabits}
            habits={habits}
            onAddCheckin={onAddCheckin}
            onAddHabit={handleAddHabit}
            onArchiveOptimistic={onArchiveOptimistic}
            onDeleteOptimistic={onDeleteOptimistic}
            onPeriodChange={setPeriodFilter}
            onRemoveCheckin={onRemoveCheckin}
            onResetOptimistic={onResetOptimistic}
            onSkip={onSkip}
            onUnSkip={onUnSkip}
            periodFilter={periodFilter}
            todayActive={todayActive}
            todayLabel={todayLabel}
            totalDaily={totalDaily}
            totalStreak={totalStreak}
          />
        </div>
      )}

      <div className="fixed right-4 bottom-6 z-50">
        <div className="flex items-center gap-3">
          <DashboardViewToggle
            activeButtonClassName="bg-foreground text-background"
            buttonClassName="rounded-full p-2 transition-all"
            currentView={currentView}
            inactiveButtonClassName="text-muted-foreground"
            onViewChange={onViewChange}
          />
        </div>
      </div>
    </>
  )
}
