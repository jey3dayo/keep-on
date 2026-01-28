import type { ReactNode } from 'react'

export interface HabitDialogProps {
  habitId: string
  habitName: string
  trigger?: ReactNode | null
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}
