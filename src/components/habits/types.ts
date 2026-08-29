import type { ReactNode } from 'react'
import type { Period } from '@/constants/habit'

export type OptimisticRollback = () => void
export type OptimisticHandler = () => OptimisticRollback | undefined
export type HabitsPeriodFilter = 'all' | Period | 'archived'

export interface HabitDialogProps {
  defaultOpen?: boolean
  habitId: string
  habitName: string
  onOpenChange?: (open: boolean) => void
  onOptimistic?: OptimisticHandler
  open?: boolean
  trigger?: ReactNode | null
}
