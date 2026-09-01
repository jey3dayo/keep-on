'use client'

import type { User } from '@/types/user'
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
}: DesktopDashboardProps) {
  const { completedHabitIds, handleAddHabit, todayActive, totalDaily } = useDashboardContent(habits)

  return (
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
      onSkip={onSkip}
      onUnSkip={onUnSkip}
      todayActive={todayActive}
      todayLabel={todayLabel}
      totalDaily={totalDaily}
    />
  )
}
