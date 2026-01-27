'use client'

import { useState } from 'react'
import { HabitArchiveDialog } from '@/components/habits/HabitArchiveDialog'
import { HabitDeleteDialog } from '@/components/habits/HabitDeleteDialog'
import { HabitEditSheet } from '@/components/habits/HabitEditSheet'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import type { HabitWithProgress } from '@/types/habit'

interface HabitActionDrawerProps {
  open: boolean
  habit: HabitWithProgress | null
  onOpenChange: (open: boolean) => void
}

export function HabitActionDrawer({ open, habit, onOpenChange }: HabitActionDrawerProps) {
  const [editSheetOpen, setEditSheetOpen] = useState(false)

  const handleEdit = () => {
    setEditSheetOpen(true)
    onOpenChange(false)
  }

  if (!habit) {
    return null
  }

  return (
    <>
      <Drawer onOpenChange={onOpenChange} open={open}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>習慣の操作</DrawerTitle>
            <DrawerDescription>{habit.name}</DrawerDescription>
          </DrawerHeader>
          <div className="flex gap-2 p-4 pt-0">
            <Button className="flex-1" onClick={handleEdit} variant="outline">
              編集
            </Button>

            <HabitArchiveDialog habitId={habit.id} habitName={habit.name} />

            <HabitDeleteDialog habitId={habit.id} habitName={habit.name} />
          </div>
        </DrawerContent>
      </Drawer>

      <HabitEditSheet habit={habit} onOpenChange={setEditSheetOpen} open={editSheetOpen} />
    </>
  )
}
