import type { IconName } from '@/components/basics/Icon'
import type { OptimisticRollback } from '@/components/habits/types'
import type { Period } from '@/constants/habit'
import type { HabitWithProgress } from '@/types/habit'

export interface DashboardBaseProps {
  habits: HabitWithProgress[]
  todayLabel: string
  pendingCheckins?: Set<string>
  onAddHabit: (
    name: string,
    icon: IconName,
    options?: { color?: string | null; period?: Period; frequency?: number }
  ) => Promise<void>
  onToggleCheckin: (habitId: string) => Promise<void>
  onArchiveOptimistic?: (habitId: string) => OptimisticRollback
  onDeleteOptimistic?: (habitId: string) => OptimisticRollback
  onResetOptimistic?: (habitId: string) => OptimisticRollback
}
