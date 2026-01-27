'use client'

import { Trash2 } from 'lucide-react'
import { deleteHabitAction } from '@/app/actions/habits/delete'
import { Button } from '@/components/ui/button'
import { HabitActionDialog } from './HabitActionDialog'

interface HabitDeleteDialogProps {
  habitId: string
  habitName: string
}

export function HabitDeleteDialog({ habitId, habitName }: HabitDeleteDialogProps) {
  return (
    <HabitActionDialog
      action={deleteHabitAction}
      confirmClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      confirmLabel="完全に削除する"
      description={
        <>「{habitName}」を完全に削除すると、この習慣と関連する全ての記録が削除されます。この操作は取り消せません。</>
      }
      errorMessage="削除に失敗しました"
      habitId={habitId}
      successMessage="習慣を完全に削除しました"
      title="習慣を完全に削除しますか？"
      trigger={
        <Button aria-label="完全削除" className="text-destructive hover:text-destructive" size="icon" variant="ghost">
          <Trash2 className="h-4 w-4" />
        </Button>
      }
    />
  )
}
