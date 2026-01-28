'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { HabitArchiveDialog } from '@/components/habits/HabitArchiveDialog'
import { HabitDeleteDialog } from '@/components/habits/HabitDeleteDialog'
import { HabitResetDialog } from '@/components/habits/HabitResetDialog'
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
  const [dialogType, setDialogType] = useState<'reset' | 'archive' | 'delete' | null>(null)
  const [activeHabit, setActiveHabit] = useState<HabitWithProgress | null>(habit)
  const prevOpenRef = useRef(open)

  useEffect(() => {
    const prevOpen = prevOpenRef.current
    prevOpenRef.current = open

    if (habit) {
      setActiveHabit(habit)
      return
    }
    if (prevOpen && !open && !dialogType) {
      setActiveHabit(null)
    }
  }, [habit, open, dialogType])

  const openDialog = (type: 'reset' | 'archive' | 'delete') => {
    if (!activeHabit) {
      return
    }
    setDialogType(type)
    if (open) {
      onOpenChange(false)
    }
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDialogType(null)
    }
  }

  const handleEdit = () => {
    // Drawerを閉じて、アニメーション完了後に遷移
    onOpenChange(false)
    // Vaulのデフォルトアニメーション時間（300ms）より少し長く待つ
    setTimeout(() => {
      if (activeHabit) {
        router.push(`/habits/${activeHabit.id}/edit`)
      }
    }, 350)
  }

  if (!(activeHabit || dialogType)) {
    return null
  }

  const isArchived = activeHabit?.archived || Boolean(activeHabit?.archivedAt)

  return (
    <>
      <Drawer onOpenChange={onOpenChange} open={open}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>習慣の操作</DrawerTitle>
            <DrawerDescription>{activeHabit?.name}</DrawerDescription>
          </DrawerHeader>
          <div className="grid grid-cols-2 gap-2 p-4 pt-0">
            <Button className="col-span-2" onClick={handleEdit} variant="outline">
              編集
            </Button>

            {!isArchived && (
              <>
                <Button className="col-span-2" onClick={() => openDialog('reset')} variant="outline">
                  進捗をリセット
                </Button>
                <Button className="col-span-2" onClick={() => openDialog('archive')} variant="outline">
                  アーカイブ
                </Button>
              </>
            )}

            {isArchived && (
              <Button className="col-span-2" onClick={() => openDialog('delete')} variant="outline">
                完全に削除
              </Button>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {activeHabit && dialogType === 'reset' ? (
        <HabitResetDialog
          habitId={activeHabit.id}
          habitName={activeHabit.name}
          onOpenChange={handleDialogOpenChange}
          open
        />
      ) : null}
      {activeHabit && dialogType === 'archive' ? (
        <HabitArchiveDialog
          habitId={activeHabit.id}
          habitName={activeHabit.name}
          onOpenChange={handleDialogOpenChange}
          open
        />
      ) : null}
      {activeHabit && dialogType === 'delete' ? (
        <HabitDeleteDialog
          habitId={activeHabit.id}
          habitName={activeHabit.name}
          onOpenChange={handleDialogOpenChange}
          open
        />
      ) : null}
    </>
  )
}
