'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HabitTableActionsProps {
  habitId: string
}

export function HabitTableActions({ habitId }: HabitTableActionsProps) {
  // TODO: 編集・削除機能は別タスクで実装
  const handleEdit = () => {
    console.log('Edit habit:', habitId)
  }

  const handleDelete = () => {
    console.log('Delete habit:', habitId)
  }

  return (
    <div className="flex justify-end gap-1">
      <Button aria-label="編集" onClick={handleEdit} size="icon" variant="ghost">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button aria-label="削除" onClick={handleDelete} size="icon" variant="ghost">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
