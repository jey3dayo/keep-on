'use client'

import type { User } from '@/types/user'
import { DashboardViewToggle } from './DashboardViewToggle'
import { HabitListView } from './HabitListView'
import { HabitSimpleView } from './HabitSimpleView'
import type { DashboardViewProps } from './types'
import { useDashboardContent } from './useDashboardContent'

interface DesktopDashboardProps extends DashboardViewProps {
  user: User
}

export function DesktopDashboard({
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
}: DesktopDashboardProps) {
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
          onSkip={onSkip}
          onUnSkip={onUnSkip}
        />
      ) : (
        <div className="space-y-6 p-6">
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

      <div className="fixed right-6 bottom-6 z-50 hidden md:block lg:right-8">
        <DashboardViewToggle currentView={currentView} onViewChange={onViewChange} />
      </div>
    </>
  )
}
