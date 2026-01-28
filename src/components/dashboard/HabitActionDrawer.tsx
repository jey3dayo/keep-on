'use client'

import { useRouter } from 'next/navigation'
import { HabitArchiveDialog } from '@/components/habits/HabitArchiveDialog'
import { HabitDeleteDialog } from '@/components/habits/HabitDeleteDialog'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import type { HabitWithProgress } from '@/types/habit'

interface HabitActionDrawerProps {
  open: boolean
  habit: HabitWithProgress | null
  onOpenChange: (open: boolean) => void
}

export function HabitActionDrawer({ open, habit, onOpenChange }: HabitActionDrawerProps) {
  const router = useRouter()

  const handleEdit = () => {
    // Drawerを閉じて、アニメーション完了後に遷移
    onOpenChange(false)
    // Vaulのデフォルトアニメーション時間（300ms）より少し長く待つ
    setTimeout(() => {
      router.push(`/habits/${habit?.id}/edit`)
    }, 350)
  }

  if (!habit) {
    return null
  }

  const isArchived = habit.archived || Boolean(habit.archivedAt)

  return (
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

          {isArchived ? (
            <HabitDeleteDialog habitId={habit.id} habitName={habit.name} />
          ) : (
            <HabitArchiveDialog habitId={habit.id} habitName={habit.name} />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
