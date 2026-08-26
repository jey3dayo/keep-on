'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/basics/Button'
import { HabitArchiveDialog } from '@/components/habits/HabitArchiveDialog'
import { HabitDeleteDialog } from '@/components/habits/HabitDeleteDialog'
import { HabitResetDialog } from '@/components/habits/HabitResetDialog'
import type { OptimisticHandler } from '@/components/habits/types'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import type { HabitWithProgress } from '@/types/habit'

const DRAWER_NAVIGATION_FALLBACK_MS = 600

interface HabitActionDrawerProps {
  habit: HabitWithProgress | null
  onArchiveOptimistic?: OptimisticHandler
  onDeleteOptimistic?: OptimisticHandler
  onOpenChange: (open: boolean) => void
  onResetOptimistic?: OptimisticHandler
  onSkip?: (habitId: string) => Promise<void>
  onUnSkip?: (habitId: string) => Promise<void>
  open: boolean
}

export function HabitActionDrawer({
  open,
  habit,
  onOpenChange,
  onArchiveOptimistic,
  onDeleteOptimistic,
  onResetOptimistic,
  onSkip,
  onUnSkip,
}: HabitActionDrawerProps) {
  const router = useRouter()
  const [dialogType, setDialogType] = useState<'reset' | 'archive' | 'delete' | null>(null)
  const [activeHabit, setActiveHabit] = useState<HabitWithProgress | null>(null)
  const [isSkipping, setIsSkipping] = useState(false)
  const pendingNavigationRef = useRef<string | null>(null)
  const navigationFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevOpenRef = useRef(open)

  const clearNavigationFallback = useCallback(() => {
    if (navigationFallbackTimerRef.current === null) {
      return
    }
    clearTimeout(navigationFallbackTimerRef.current)
    navigationFallbackTimerRef.current = null
  }, [])

  useEffect(() => {
    const prevOpen = prevOpenRef.current
    prevOpenRef.current = open

    if (habit) {
      setActiveHabit(habit)
      return
    }
    if (prevOpen && !open && !dialogType && pendingNavigationRef.current === null) {
      setActiveHabit(null)
    }
  }, [habit, open, dialogType])

  useEffect(() => clearNavigationFallback, [clearNavigationFallback])

  const openDialog = useCallback(
    (type: 'reset' | 'archive' | 'delete') => {
      if (!activeHabit) {
        return
      }
      setDialogType(type)
      if (open) {
        onOpenChange(false)
      }
    },
    [activeHabit, onOpenChange, open]
  )

  const handleDialogOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setDialogType(null)
    }
  }, [])

  const handleDrawerAnimationEnd = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        return
      }
      const destination = pendingNavigationRef.current
      if (!destination) {
        return
      }
      clearNavigationFallback()
      pendingNavigationRef.current = null
      router.push(destination)
    },
    [clearNavigationFallback, router]
  )

  const navigateAfterDrawerClose = useCallback(
    (destination: string) => {
      clearNavigationFallback()
      pendingNavigationRef.current = destination

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        pendingNavigationRef.current = null
        onOpenChange(false)
        router.push(destination)
        return
      }

      navigationFallbackTimerRef.current = setTimeout(() => {
        navigationFallbackTimerRef.current = null
        const fallbackDestination = pendingNavigationRef.current
        if (!fallbackDestination) {
          return
        }
        pendingNavigationRef.current = null
        console.warn('HabitActionDrawer: onAnimationEnd(false) が発火しなかったためフォールバック遷移を実行します')
        router.push(fallbackDestination)
      }, DRAWER_NAVIGATION_FALLBACK_MS)

      onOpenChange(false)
    },
    [clearNavigationFallback, onOpenChange, router]
  )

  const handleEdit = useCallback(() => {
    if (activeHabit) {
      navigateAfterDrawerClose(`/habits/${activeHabit.id}/edit`)
    }
  }, [activeHabit, navigateAfterDrawerClose])

  const handleSkipToggle = useCallback(async () => {
    if (!activeHabit || isSkipping) {
      return
    }
    setIsSkipping(true)
    try {
      if (activeHabit.skippedToday) {
        await onUnSkip?.(activeHabit.id)
      } else {
        await onSkip?.(activeHabit.id)
      }
      onOpenChange(false)
    } finally {
      setIsSkipping(false)
    }
  }, [activeHabit, isSkipping, onOpenChange, onSkip, onUnSkip])

  const handleViewDetail = useCallback(() => {
    if (activeHabit) {
      navigateAfterDrawerClose(`/habits/${activeHabit.id}`)
    }
  }, [activeHabit, navigateAfterDrawerClose])

  const handleReset = useCallback(() => openDialog('reset'), [openDialog])
  const handleArchive = useCallback(() => openDialog('archive'), [openDialog])
  const handleDelete = useCallback(() => openDialog('delete'), [openDialog])

  if (!(activeHabit || dialogType)) {
    return null
  }

  const isArchived = activeHabit?.archived || Boolean(activeHabit?.archivedAt)

  return (
    <>
      <Drawer onAnimationEnd={handleDrawerAnimationEnd} onOpenChange={onOpenChange} open={open}>
        {/* 下端固定の Drawer なので iOS のホームインジケータ分を確保する */}
        <DrawerContent className="pb-[env(safe-area-inset-bottom)]">
          <DrawerHeader className="text-left">
            <DrawerTitle>習慣の操作</DrawerTitle>
            <DrawerDescription>{activeHabit?.name}</DrawerDescription>
          </DrawerHeader>
          <div className="grid grid-cols-2 gap-2 p-4 pt-0">
            <Button className="col-span-2" onClick={handleEdit} variant="outline">
              編集
            </Button>

            <Button className="col-span-2" onClick={handleViewDetail} variant="outline">
              カレンダー履歴を見る
            </Button>

            {isArchived ? null : (
              <>
                {onSkip || onUnSkip ? (
                  <Button className="col-span-2" disabled={isSkipping} onClick={handleSkipToggle} variant="outline">
                    {activeHabit?.skippedToday ? '今日のスキップを解除' : '今日をスキップ（ストリーク維持）'}
                  </Button>
                ) : null}
                <Button className="col-span-2" onClick={handleReset} variant="outline">
                  進捗をリセット
                </Button>
                <Button className="col-span-2" onClick={handleArchive} variant="outline">
                  アーカイブ
                </Button>
              </>
            )}

            {isArchived ? (
              <Button className="col-span-2" onClick={handleDelete} variant="outline">
                完全に削除
              </Button>
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>

      {activeHabit && dialogType === 'reset' ? (
        <HabitResetDialog
          habitId={activeHabit.id}
          habitName={activeHabit.name}
          onOpenChange={handleDialogOpenChange}
          onOptimistic={onResetOptimistic}
          open
        />
      ) : null}
      {activeHabit && dialogType === 'archive' ? (
        <HabitArchiveDialog
          habitId={activeHabit.id}
          habitName={activeHabit.name}
          onOpenChange={handleDialogOpenChange}
          onOptimistic={onArchiveOptimistic}
          open
        />
      ) : null}
      {activeHabit && dialogType === 'delete' ? (
        <HabitDeleteDialog
          habitId={activeHabit.id}
          habitName={activeHabit.name}
          onOpenChange={handleDialogOpenChange}
          onOptimistic={onDeleteOptimistic}
          open
        />
      ) : null}
    </>
  )
}
