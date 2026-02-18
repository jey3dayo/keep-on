import type { ReactNode } from 'react'

export type OptimisticRollback = () => void
export type OptimisticHandler = () => OptimisticRollback | undefined

export interface HabitDialogProps {
  defaultOpen?: boolean
  habitId: string
  habitName: string
  onOpenChange?: (open: boolean) => void
  onOptimistic?: OptimisticHandler
  open?: boolean
  trigger?: ReactNode | null
}
