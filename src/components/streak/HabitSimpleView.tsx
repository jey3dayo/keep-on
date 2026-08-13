'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resetHabitProgressAction } from '@/app/actions/habits/reset'
import { Button } from '@/components/basics/Button'
import { Icon } from '@/components/basics/Icon'
import type { OptimisticRollback } from '@/components/habits/types'
import { DashboardBackground } from '@/components/streak/DashboardBackground'
import { DashboardBottomBar } from '@/components/streak/DashboardBottomBar'
import { HabitCircleItem } from '@/components/streak/HabitCircleItem'
import { ProgressRing } from '@/components/streak/ProgressRing'
import { DEFAULT_HABIT_COLOR } from '@/constants/habit'
import { getColorById } from '@/constants/habit-data'
import { LONG_PRESS_DURATION_MS, LONG_PRESS_MOVE_THRESHOLD_PX } from '@/constants/interaction'
import { RETRY_DELAY_MS, RETRY_MAX_ATTEMPTS } from '@/constants/retry'
import { cn } from '@/lib/utils'
import { getRingColorFromBackground } from '@/lib/utils/color'
import { appToast } from '@/lib/utils/toast'
import type { HabitWithProgress } from '@/types/habit'

const RESET_DIALOG_EXIT_MS = 200

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
  onSettings?: () => void
  onSkip?: (habitId: string) => Promise<void>
  onUnSkip?: (habitId: string) => Promise<void>
  // バーは body へ portal されるため、md:hidden 等の祖先の表示切替が効かない。
  // 同時にマウントされる別ブレークポイントのツリーでは false にして二重描画を防ぐ
  showBottomBar?: boolean
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
  onSettings,
  onSkip,
  onUnSkip,
  backgroundColor,
  showBottomBar = true,
}: HabitSimpleViewProps) {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(0)
  const [resetConfirm, setResetConfirm] = useState<{ habitId: string; habitName: string } | null>(null)
  const [resetDialogEntered, setResetDialogEntered] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [drawerState, setDrawerState] = useState<{ open: boolean; habit: HabitWithProgress | null }>({
    habit: null,
    open: false,
  })
  const [drawerHabitId, setDrawerHabitId] = useState<string | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const longPressTriggeredRef = useRef(false)
  const longPressStartPointRef = useRef<{ x: number; y: number } | null>(null)
  const resetDialogExitTimerRef = useRef<NodeJS.Timeout | null>(null)

  const habitsPerPage = 6
  const totalPages = Math.max(1, Math.ceil(habits.length / habitsPerPage))

  useEffect(() => {
    setCurrentPage((current) => Math.min(current, totalPages - 1))
  }, [totalPages])

  useEffect(() => {
    if (!resetConfirm) {
      setResetDialogEntered(false)
      return
    }
    const frame = requestAnimationFrame(() => {
      setResetDialogEntered(true)
    })
    return () => cancelAnimationFrame(frame)
  }, [resetConfirm])

  useEffect(
    () => () => {
      if (resetDialogExitTimerRef.current) {
        clearTimeout(resetDialogExitTimerRef.current)
      }
    },
    []
  )

  const closeResetDialog = useCallback(() => {
    setResetDialogEntered(false)
    if (resetDialogExitTimerRef.current) {
      clearTimeout(resetDialogExitTimerRef.current)
    }
    resetDialogExitTimerRef.current = setTimeout(() => {
      setResetConfirm(null)
      resetDialogExitTimerRef.current = null
    }, RESET_DIALOG_EXIT_MS)
  }, [])

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

  const ringBgColor = getRingColorFromBackground(bgColor)

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

  const runResetWithRetry = useCallback(async (habitId: string) => {
    const maxAttempts = Math.max(1, RETRY_MAX_ATTEMPTS)
    let lastError: unknown = null

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const result = await resetHabitProgressAction(habitId)
        if (result.ok) {
          return { ok: true as const, result }
        }
        return { ok: false as const, result }
      } catch (error) {
        lastError = error
        if (attempt < maxAttempts - 1 && RETRY_DELAY_MS > 0) {
          await new Promise<void>((resolve) => {
            setTimeout(resolve, RETRY_DELAY_MS)
          })
        }
      }
    }

    return { error: lastError, ok: false as const }
  }, [])

  const handleResetConfirm = useCallback(async () => {
    if (!resetConfirm || isResetting) {
      return
    }

    const habitId = resetConfirm.habitId
    const rollback = onResetOptimistic?.(habitId)

    setIsResetting(true)
    try {
      const { ok, result, error } = await runResetWithRetry(habitId)

      if (ok) {
        appToast.success('進捗をリセットしました')
        closeResetDialog()
        router.refresh()
        return
      }

      if (rollback) {
        rollback()
      }

      if (result) {
        appToast.error('進捗のリセットに失敗しました', result.error)
        return
      }

      appToast.error('進捗のリセットに失敗しました', error)
    } finally {
      setIsResetting(false)
    }
  }, [closeResetDialog, isResetting, onResetOptimistic, resetConfirm, router, runResetWithRetry])

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
        openDrawer(habit)
      }, LONG_PRESS_DURATION_MS)
    },
    [openDrawer]
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
  const handleResetBackdropClick = useCallback(() => {
    if (!isResetting) {
      closeResetDialog()
    }
  }, [closeResetDialog, isResetting])
  const handlePageChange = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const page = Number(event.currentTarget.dataset.page)
    if (Number.isInteger(page)) {
      setCurrentPage(page)
    }
  }, [])

  const pages = useMemo(() => Array.from({ length: totalPages }, (_, page) => page), [totalPages])

  const handleSettings = useCallback(() => {
    if (onSettings) {
      onSettings()
      return
    }
    router.push('/settings')
  }, [onSettings, router])

  return (
    <DashboardBackground backgroundColor={bgColor} className="overflow-hidden">
      <main className="relative flex flex-1 items-start justify-center px-4 pt-8 pb-24">
        <div className={cn('grid w-full max-w-md grid-cols-2 gap-6')}>
          {currentHabits.map((habit) => {
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
              <ProgressRing
                backgroundColor={ringBgColor}
                progress={0}
                progressColor="rgba(255, 255, 255, 0.95)"
                size={140}
                strokeWidth={6}
              />

              <div
                className="flex h-[120px] w-[120px] items-center justify-center rounded-full ring-1 ring-white/15"
                style={{ backgroundColor: bgColor }}
              >
                <Icon className="h-14 w-14 text-white/90" name="plus" />
              </div>
            </Button>

            <p className="text-center font-medium text-base text-white">タスクを追加</p>
          </div>
        </div>
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

      {resetConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Button
            aria-label="閉じる"
            className="dialog-backdrop absolute inset-0 h-full w-full bg-black/50 p-0 backdrop-blur-sm hover:bg-black/50"
            data-entered={resetDialogEntered ? 'true' : undefined}
            onClick={handleResetBackdropClick}
            type="button"
            variant="ghost"
          />

          <div
            className="dialog-scale-in relative w-full max-w-xs rounded-2xl bg-card p-6 shadow-2xl"
            data-entered={resetDialogEntered ? 'true' : undefined}
          >
            <h3 className="mb-2 text-center font-semibold text-foreground text-lg">進捗をリセットしますか？</h3>
            <p className="mb-6 text-center text-muted-foreground text-sm">
              「{resetConfirm.habitName}」の今日のチェックインを削除して、進捗を0に戻します
            </p>

            <div className="flex gap-3">
              <Button
                className="flex-1 rounded-xl px-4 py-3"
                disabled={isResetting}
                onClick={closeResetDialog}
                type="button"
                variant="secondary"
              >
                キャンセル
              </Button>
              <Button
                className="flex-1 rounded-xl px-4 py-3 text-white"
                disabled={isResetting}
                onClick={handleResetConfirm}
                style={{ backgroundColor: bgColor }}
                type="button"
                variant="ghost"
              >
                リセットする
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showBottomBar ? (
        <DashboardBottomBar
          className="md:hidden"
          leftSlot={
            <div className="pointer-events-auto flex items-center">
              <Button
                aria-label="設定を開く"
                className="h-11 w-11 rounded-full border border-white/20 bg-white/10 p-0 text-white/80 hover:bg-white/20 hover:text-white"
                onClick={handleSettings}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Icon className="h-6 w-6" name="settings" />
              </Button>

              {totalPages > 1 ? (
                <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
                  {pages.map((page) => (
                    <Button
                      aria-label={`ページ ${page + 1}`}
                      className={cn(
                        'h-2 w-2 rounded-full p-0 transition-all duration-300 hover:bg-transparent',
                        currentPage === page ? 'h-2.5 w-2.5 bg-white' : 'bg-white/40 hover:bg-white/60'
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
              ) : (
                <div className="h-2" />
              )}
            </div>
          }
        />
      ) : null}
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
