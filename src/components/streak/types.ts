import type { OptimisticRollback } from '@/components/habits/types'
import type { DashboardView } from '@/constants/dashboard'
import type { Period } from '@/constants/habit'
import type { HabitWithProgress } from '@/types/habit'

interface DashboardBaseProps {
  habits: HabitWithProgress[]
  onAddCheckin?: (habitId: string) => Promise<void>
  onArchiveOptimistic?: (habitId: string) => OptimisticRollback
  onDeleteOptimistic?: (habitId: string) => OptimisticRollback
  onRemoveCheckin?: (habitId: string) => Promise<void>
  onResetOptimistic?: (habitId: string) => OptimisticRollback
  onSkip?: (habitId: string) => Promise<void>
  onUnSkip?: (habitId: string) => Promise<void>
  todayLabel: string
}

export interface DashboardViewProps extends DashboardBaseProps {
  currentView: DashboardView
  onViewChange: (view: DashboardView) => void
}

export type DashboardPeriodFilter = 'all' | Period
