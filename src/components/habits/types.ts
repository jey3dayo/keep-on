import type { ReactNode } from 'react'

export type OptimisticRollback = () => void
export type OptimisticHandler = () => OptimisticRollback | undefined

export interface HabitDialogProps {
  habitId: string
  habitName: string
  trigger?: ReactNode | null
  onOptimistic?: OptimisticHandler
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}
