'use client'

import { Archive, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconLabelButton } from '@/components/basics/IconLabelButton'
import { HabitArchiveDialog } from './HabitArchiveDialog'
import { HabitDeleteDialog } from './HabitDeleteDialog'

interface HabitTableActionsProps {
  habitId: string
  habitName: string
  archived: boolean
  onEdit: (habitId: string) => void
  onArchiveOptimistic?: () => void | (() => void)
}

export function HabitTableActions({ habitId, habitName, archived, onEdit, onArchiveOptimistic }: HabitTableActionsProps) {
  return (
    <div className="flex justify-end gap-1">
      {!archived && (
        <Button aria-label="編集" onClick={() => onEdit(habitId)} size="icon" variant="ghost">
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {archived ? (
        <HabitDeleteDialog habitId={habitId} habitName={habitName} />
      ) : (
        <HabitArchiveDialog
          habitId={habitId}
          habitName={habitName}
          onOptimistic={onArchiveOptimistic}
          trigger={
            <IconLabelButton icon={<Archive className="h-4 w-4" />} label="アーカイブ" size="sm" variant="outline" />
          }
        />
      )}
    </div>
  )
}
