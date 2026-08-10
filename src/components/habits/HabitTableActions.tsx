'use client'

import { Archive, Pencil } from 'lucide-react'
import { useCallback } from 'react'
import { Button } from '@/components/basics/Button'
import { IconLabelButton } from '@/components/basics/IconLabelButton'
import type { OptimisticHandler } from '@/components/habits/types'
import { HabitArchiveDialog } from './HabitArchiveDialog'
import { HabitDeleteDialog } from './HabitDeleteDialog'

interface HabitTableActionsProps {
  archived: boolean
  habitId: string
  habitName: string
  onArchiveOptimistic?: OptimisticHandler
  onEdit: (habitId: string) => void
}

export function HabitTableActions({
  habitId,
  habitName,
  archived,
  onEdit,
  onArchiveOptimistic,
}: HabitTableActionsProps) {
  const handleEdit = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation()
      onEdit(habitId)
    },
    [habitId, onEdit]
  )
  const stopPropagation = useCallback((event: React.MouseEvent) => event.stopPropagation(), [])

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {!archived && (
        <Button aria-label="編集" className="shrink-0" onClick={handleEdit} size="icon" variant="ghost">
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
            <IconLabelButton
              className="shrink-0 whitespace-nowrap"
              icon={<Archive className="h-4 w-4" />}
              label="アーカイブ"
              onClick={stopPropagation}
              size="sm"
              variant="outline"
            />
          }
        />
      )}
    </div>
  )
}
