import type { ReactNode } from 'react'

export type OptimisticHandler = () => void | (() => void)

export interface HabitDialogProps {
  habitId: string
  habitName: string
  trigger?: ReactNode | null
  onOptimistic?: OptimisticHandler
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}
