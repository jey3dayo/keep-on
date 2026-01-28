'use client'

import type { ReactNode } from 'react'
import { archiveHabitAction } from '@/app/actions/habits/archive'
import { Button } from '@/components/ui/button'
import { HabitActionDialog } from './HabitActionDialog'

interface HabitArchiveDialogProps {
  habitId: string
  habitName: string
  trigger?: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function HabitArchiveDialog({
  habitId,
  habitName,
  trigger,
  open,
  defaultOpen,
  onOpenChange,
}: HabitArchiveDialogProps) {
  const shouldUseDefaultTrigger = trigger === undefined && open === undefined
  const resolvedTrigger =
    trigger ??
    (shouldUseDefaultTrigger ? (
      <Button className="col-span-2" variant="outline">
        アーカイブ
      </Button>
    ) : undefined)

  return (
    <HabitActionDialog
      action={archiveHabitAction}
      confirmLabel="アーカイブする"
      defaultOpen={defaultOpen}
      description={<>「{habitName}」をアーカイブすると、一覧から非表示になります。後で復元することができます。</>}
      errorMessage="アーカイブに失敗しました"
      habitId={habitId}
      onOpenChange={onOpenChange}
      open={open}
      successMessage="習慣をアーカイブしました"
      title="習慣をアーカイブしますか？"
      trigger={resolvedTrigger}
    />
  )
}
