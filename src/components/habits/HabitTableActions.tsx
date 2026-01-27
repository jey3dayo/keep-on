'use client'

import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HabitArchiveDialog } from './HabitArchiveDialog'
import { HabitDeleteDialog } from './HabitDeleteDialog'

interface HabitTableActionsProps {
  habitId: string
  habitName: string
  archived: boolean
  onEdit: (habitId: string) => void
}

export function HabitTableActions({ habitId, habitName, archived, onEdit }: HabitTableActionsProps) {
  return (
    <div className="flex justify-end gap-1">
      <Button aria-label="編集" onClick={() => onEdit(habitId)} size="icon" variant="ghost">
        <Pencil className="h-4 w-4" />
      </Button>
      {archived ? (
        <HabitDeleteDialog habitId={habitId} habitName={habitName} />
      ) : (
        <HabitArchiveDialog habitId={habitId} habitName={habitName} />
      )}
    </div>
  )
}
