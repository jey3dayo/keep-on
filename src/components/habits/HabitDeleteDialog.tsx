'use client'

import { deleteHabitAction } from '@/app/actions/habits/delete'
import { Button } from '@/components/ui/button'
import { HabitActionDialog } from './HabitActionDialog'
import type { HabitDialogProps } from './types'

export function HabitDeleteDialog({
  habitId,
  habitName,
  trigger,
  onOptimistic,
  open,
  defaultOpen,
  onOpenChange,
}: HabitDialogProps) {
  const shouldUseDefaultTrigger = trigger === undefined && open === undefined
  const resolvedTrigger =
    trigger ??
    (shouldUseDefaultTrigger ? (
      <Button className="col-span-2" variant="outline">
        完全に削除
      </Button>
    ) : undefined)

  return (
    <HabitActionDialog
      action={deleteHabitAction}
      confirmClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      confirmLabel="完全に削除する"
      defaultOpen={defaultOpen}
      description={
        <>「{habitName}」を完全に削除すると、この習慣と関連する全ての記録が削除されます。この操作は取り消せません。</>
      }
      errorMessage="削除に失敗しました"
      habitId={habitId}
      onOpenChange={onOpenChange}
      onOptimistic={onOptimistic}
      open={open}
      successMessage="習慣を完全に削除しました"
      title="習慣を完全に削除しますか？"
      trigger={resolvedTrigger}
    />
  )
}
