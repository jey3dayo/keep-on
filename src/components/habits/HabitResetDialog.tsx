'use client'

import { resetHabitProgressAction } from '@/app/actions/habits/reset'
import { Button } from '@/components/ui/button'
import { HabitActionDialog } from './HabitActionDialog'
import type { HabitDialogProps } from './types'

export function HabitResetDialog({ habitId, habitName, trigger, open, defaultOpen, onOpenChange }: HabitDialogProps) {
  const shouldUseDefaultTrigger = trigger === undefined && open === undefined
  const resolvedTrigger =
    trigger ??
    (shouldUseDefaultTrigger ? (
      <Button className="col-span-2" variant="outline">
        進捗をリセット
      </Button>
    ) : null)

  return (
    <HabitActionDialog
      action={resetHabitProgressAction}
      confirmClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      confirmLabel="リセット"
      defaultOpen={defaultOpen}
      description={<>「{habitName}」の今日のチェックインを削除して、進捗を0に戻します</>}
      errorMessage="進捗のリセットに失敗しました"
      habitId={habitId}
      onOpenChange={onOpenChange}
      open={open}
      successMessage="進捗をリセットしました"
      title="進捗をリセットしますか？"
      trigger={resolvedTrigger}
    />
  )
}
