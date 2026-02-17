import type { OptimisticRollback } from '@/components/habits/types'
import type { HabitWithProgress } from '@/types/habit'

export interface DashboardBaseProps {
  habits: HabitWithProgress[]
  onAddCheckin?: (habitId: string) => Promise<void>
  onArchiveOptimistic?: (habitId: string) => OptimisticRollback
  onDeleteOptimistic?: (habitId: string) => OptimisticRollback
  onRemoveCheckin?: (habitId: string) => Promise<void>
  onResetOptimistic?: (habitId: string) => OptimisticRollback
  todayLabel: string
}
