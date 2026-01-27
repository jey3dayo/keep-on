'use client'

import { Archive } from 'lucide-react'
import { archiveHabitAction } from '@/app/actions/habits/archive'
import { Button } from '@/components/ui/button'
import { HabitActionDialog } from './HabitActionDialog'

interface HabitArchiveDialogProps {
  habitId: string
  habitName: string
}

export function HabitArchiveDialog({ habitId, habitName }: HabitArchiveDialogProps) {
  return (
    <HabitActionDialog
      action={archiveHabitAction}
      confirmLabel="アーカイブする"
      description={<>「{habitName}」をアーカイブすると、一覧から非表示になります。後で復元することができます。</>}
      errorMessage="アーカイブに失敗しました"
      habitId={habitId}
      successMessage="習慣をアーカイブしました"
      title="習慣をアーカイブしますか？"
      trigger={
        <Button aria-label="アーカイブ" size="icon" variant="ghost">
          <Archive className="h-4 w-4" />
        </Button>
      }
    />
  )
}
