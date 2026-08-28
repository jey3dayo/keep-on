'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/basics/Button'
import { Icon } from '@/components/basics/Icon'
import type { OptimisticRollback } from '@/components/habits/types'
import { DashboardBackground } from '@/components/streak/DashboardBackground'
import { HabitCircleItem } from '@/components/streak/HabitCircleItem'
import { DEFAULT_HABIT_COLOR } from '@/constants/habit'
import { getColorById } from '@/constants/habit-data'
import { LONG_PRESS_DURATION_MS, LONG_PRESS_MOVE_THRESHOLD_PX } from '@/constants/interaction'
import { usePageSwipe } from '@/hooks/usePageSwipe'
import { cn } from '@/lib/utils'
import type { HabitWithProgress } from '@/types/habit'

// 進捗リングのトラック色。背景色から黒mixで派生させると全習慣が濃い縁のドーナツに見えるため、
// 背景によらない控えめな白トラックに固定する（進捗ストロークは white 0.95 のまま）。
const RING_BACKGROUND_COLOR = 'rgba(255, 255, 255, 0.2)'

// Drawerコンポーネントを動的にインポート
const HabitActionDrawer = dynamic(
  () => import('@/components/dashboard/HabitActionDrawer').then((mod) => mod.HabitActionDrawer),
  {
    ssr: false,
  }
)

interface HabitSimpleViewProps {
  backgroundColor?: string
  completedHabitIds: Set<string>
  habits: HabitWithProgress[]
  onAddCheckin?: (habitId: string) => Promise<void>
  onAddHabit: () => void
  onArchiveOptimistic?: (habitId: string) => OptimisticRollback
  onDeleteOptimistic?: (habitId: string) => OptimisticRollback
  onRemoveCheckin?: (habitId: string) => Promise<void>
  onResetOptimistic?: (habitId: string) => OptimisticRollback
  onSkip?: (habitId: string) => Promise<void>
  onUnSkip?: (habitId: string) => Promise<void>
  // デスクトップ経路ではモバイル用ページドットを描画しないため false にする。
  showPageDots?: boolean
}

export function HabitSimpleView({
  habits,
  completedHabitIds,
  onAddCheckin,
  onRemoveCheckin,
  onAddHabit,
  onArchiveOptimistic,
  onDeleteOptimistic,
  onResetOptimistic,
  onSkip,
  onUnSkip,
  backgroundColor,
  showPageDots = true,
}: HabitSimpleViewProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const [drawerState, setDrawerState] = useState<{ open: boolean; habit: HabitWithProgress | null }>({
    habit: null,
    open: false,
  })
  const [drawerHabitId, setDrawerHabitId] = useState<string | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const longPressTriggeredRef = useRef(false)
  const longPressStartPointRef = useRef<{ x: number; y: number } | null>(null)

  const habitsPerPage = 6
  const totalPages = Math.max(1, Math.ceil(habits.length / habitsPerPage))

  useEffect(() => {
    setCurrentPage((current) => Math.min(current, totalPages - 1))
  }, [totalPages])

  const currentHabits = useMemo(
    () => habits.slice(currentPage * habitsPerPage, (currentPage + 1) * habitsPerPage),
    [currentPage, habits]
  )

  const fallbackBgColor = useMemo(() => {
    const firstHabit = currentHabits[0]
    if (!firstHabit) {
      return getColorById(DEFAULT_HABIT_COLOR).color
    }
    return getColorById(firstHabit.color ?? DEFAULT_HABIT_COLOR).color
  }, [currentHabits])

  const bgColor = backgroundColor ?? fallbackBgColor

  const ringBgColor = RING_BACKGROUND_COLOR
  const {
    cancelSwipe,
    handleClickCapture,
    handlePointerCancel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleTransitionEnd,
    isSnapping,
    trackStyle,
  } = usePageSwipe({ currentPage, onPageChange: setCurrentPage, totalPages })

  const handleProgressClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, habit: HabitWithProgress, isCompleted: boolean) => {
      if (longPressTriggeredRef.current) {
        event.preventDefault()
        event.stopPropagation()
        longPressTriggeredRef.current = false
        return
      }

      // 完了済みの場合は削除、未完了の場合は追加
      if (isCompleted) {
        if (onRemoveCheckin) {
          onRemoveCheckin(habit.id)
        }
      } else if (onAddCheckin) {
        onAddCheckin(habit.id)
      }
    },
    [onAddCheckin, onRemoveCheckin]
  )

  const openDrawer = useCallback((habit: HabitWithProgress) => {
    setDrawerHabitId(habit.id)
    setDrawerState({ habit, open: true })
  }, [])

  const closeDrawer = useCallback(() => {
    setDrawerState({ habit: null, open: false })
  }, [])

  const handleLongPressStart = useCallback(
    (habit: HabitWithProgress, event: React.PointerEvent<HTMLButtonElement>) => {
      longPressTriggeredRef.current = false
      longPressStartPointRef.current = { x: event.clientX, y: event.clientY }
      longPressTimerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true
        cancelSwipe()
        openDrawer(habit)
      }, LONG_PRESS_DURATION_MS)
    },
    [cancelSwipe, openDrawer]
  )

  const handleLongPressMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const startPoint = longPressStartPointRef.current
    if (!(startPoint && longPressTimerRef.current)) {
      return
    }
    const deltaX = event.clientX - startPoint.x
    const deltaY = event.clientY - startPoint.y
    if (Math.hypot(deltaX, deltaY) > LONG_PRESS_MOVE_THRESHOLD_PX) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const handleLongPressEnd = useCallback((resetTriggered: boolean) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressStartPointRef.current = null
    if (resetTriggered) {
      longPressTriggeredRef.current = false
    }
  }, [])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, habit: HabitWithProgress) => {
      e.preventDefault()
      longPressTriggeredRef.current = true
      openDrawer(habit)
    },
    [openDrawer]
  )
  const handleDrawerOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeDrawer()
      }
    },
    [closeDrawer]
  )
  const handlePageChange = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const page = Number(event.currentTarget.dataset.page)
    if (Number.isInteger(page)) {
      setCurrentPage(page)
    }
  }, [])

  const pages = useMemo(() => Array.from({ length: totalPages }, (_, page) => page), [totalPages])
  const handleSwipePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      handlePointerCancel(event)
      handleLongPressEnd(true)
    },
    [handleLongPressEnd, handlePointerCancel]
  )
  const handleSwipePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      handlePointerUp(event)
      handleLongPressEnd(false)
    },
    [handleLongPressEnd, handlePointerUp]
  )

  return (
    <DashboardBackground backgroundColor={bgColor} className="overflow-hidden">
      {/* 旧 footer slot に確保していた下部余白は、ページドットを本文フローへ移したため不要。
          上パディングはビュートグルがナビへ移ってヘッダー直下が詰まるようになったため、幅によらず確保する。
          縦に溢れる分は layout 側の overflow-y-auto がスクロールで受ける。 */}
      <main className="relative flex flex-1 flex-col items-center px-4 pt-6 pb-8 md:pt-10">
        <div
          className="w-full max-w-md touch-pan-y overflow-hidden"
          onClickCapture={handleClickCapture}
          onPointerCancel={handleSwipePointerCancel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handleSwipePointerUp}
        >
          <div
            className={cn('flex', isSnapping && 'transition-transform ease-out motion-reduce:transition-none')}
            onTransitionEnd={handleTransitionEnd}
            style={trackStyle}
          >
            {pages.map((page) => {
              const pageHabits = habits.slice(page * habitsPerPage, (page + 1) * habitsPerPage)
              return (
                <div
                  aria-hidden={page !== currentPage}
                  className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-8"
                  inert={page !== currentPage}
                  key={`habit-page-${page}`}
                  style={{ width: `${100 / totalPages}%` }}
                >
                  {pageHabits.map((habit) => {
                    const isCompleted = completedHabitIds.has(habit.id)
                    return (
                      <HabitCircleItemContainer
                        bgColor={bgColor}
                        habit={habit}
                        isCompleted={isCompleted}
                        key={habit.id}
                        onAddCheckin={onAddCheckin}
                        onContextMenu={handleContextMenu}
                        onLongPressEnd={handleLongPressEnd}
                        onLongPressMove={handleLongPressMove}
                        onLongPressStart={handleLongPressStart}
                        onProgressClick={handleProgressClick}
                        onRemoveCheckin={onRemoveCheckin}
                        ringBgColor={ringBgColor}
                      />
                    )
                  })}

                  <div className="flex flex-col items-center gap-3">
                    <Button
                      aria-label="習慣を追加"
                      className="relative h-[140px] w-[140px] p-0 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-0"
                      onClick={onAddHabit}
                      scale="md"
                      type="button"
                      variant="ghost"
                    >
                      <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full border-2 border-white/40 border-dashed bg-white/5">
                        <Icon className="h-14 w-14 text-white/80" name="plus" />
                      </div>
                    </Button>

                    <p className="text-center font-medium text-base text-white/80">習慣を追加</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 設定ピルは設定タブと完全に重複するため削除し、ページドットだけをコンテンツフローに残す。 */}
        {showPageDots && totalPages > 1 ? (
          // ドットは見た目を 8px のまま after:-inset-[18px] で 44×44px の当たり判定にする。
          // gap を詰めるとエキスパンダが重なり隣が押せなくなるため、gap-9 で中心間隔も 44px に固定する。
          <div className="mt-9 flex items-center justify-center gap-9">
            {pages.map((page) => (
              <Button
                aria-label={`ページ ${page + 1}`}
                className={cn(
                  "relative h-2 w-2 rounded-full p-0 transition-[transform,background-color] duration-200 after:absolute after:-inset-[18px] after:content-[''] hover:bg-transparent motion-reduce:scale-100",
                  currentPage === page ? 'scale-125 bg-white' : 'bg-white/40 hover:bg-white/60'
                )}
                data-page={page}
                key={`page-${page}`}
                onClick={handlePageChange}
                size="icon"
                type="button"
                variant="ghost"
              />
            ))}
          </div>
        ) : null}
      </main>

      {/* アクションDrawer */}
      <HabitActionDrawer
        habit={drawerState.habit}
        onArchiveOptimistic={
          drawerHabitId && onArchiveOptimistic ? () => onArchiveOptimistic(drawerHabitId) : undefined
        }
        onDeleteOptimistic={drawerHabitId && onDeleteOptimistic ? () => onDeleteOptimistic(drawerHabitId) : undefined}
        onOpenChange={handleDrawerOpenChange}
        onResetOptimistic={drawerHabitId && onResetOptimistic ? () => onResetOptimistic(drawerHabitId) : undefined}
        onSkip={drawerHabitId && onSkip ? () => onSkip(drawerHabitId) : undefined}
        onUnSkip={drawerHabitId && onUnSkip ? () => onUnSkip(drawerHabitId) : undefined}
        open={drawerState.open}
      />
    </DashboardBackground>
  )
}

function HabitCircleItemContainer({
  habit,
  isCompleted,
  onAddCheckin,
  onContextMenu,
  onLongPressEnd,
  onLongPressMove,
  onLongPressStart,
  onProgressClick,
  onRemoveCheckin,
  ...props
}: {
  bgColor: string
  ringBgColor: string
  habit: HabitWithProgress
  isCompleted: boolean
  onAddCheckin?: (habitId: string) => Promise<void>
  onContextMenu: (event: React.MouseEvent, habit: HabitWithProgress) => void
  onLongPressEnd: (resetTriggered: boolean) => void
  onLongPressMove: (event: React.PointerEvent<HTMLButtonElement>) => void
  onLongPressStart: (habit: HabitWithProgress, event: React.PointerEvent<HTMLButtonElement>) => void
  onProgressClick: (event: React.MouseEvent<HTMLButtonElement>, habit: HabitWithProgress, isCompleted: boolean) => void
  onRemoveCheckin?: (habitId: string) => Promise<void>
}) {
  const handleAdd = useCallback(() => onAddCheckin?.(habit.id), [habit.id, onAddCheckin])
  const handleCheckin = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => onProgressClick(event, habit, isCompleted),
    [habit, isCompleted, onProgressClick]
  )
  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => onContextMenu(event, habit),
    [habit, onContextMenu]
  )
  const handleLongPressStart = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => onLongPressStart(habit, event),
    [habit, onLongPressStart]
  )
  const handleRemove = useCallback(() => onRemoveCheckin?.(habit.id), [habit.id, onRemoveCheckin])
  return (
    <HabitCircleItem
      {...props}
      habit={habit}
      isCompleted={isCompleted}
      onAddCheckin={onAddCheckin ? handleAdd : undefined}
      onCheckin={handleCheckin}
      onContextMenu={handleContextMenu}
      onLongPressEnd={onLongPressEnd}
      onLongPressMove={onLongPressMove}
      onLongPressStart={handleLongPressStart}
      onRemoveCheckin={onRemoveCheckin ? handleRemove : undefined}
    />
  )
}
