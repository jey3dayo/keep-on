'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { resetHabitProgressAction } from '@/app/actions/habits/reset'
import { Button } from '@/components/basics/Button'
import { Icon, normalizeIconName } from '@/components/basics/Icon'
import type { OptimisticRollback } from '@/components/habits/types'
import { DEFAULT_HABIT_COLOR } from '@/constants/habit'
import { getColorById, getIconById } from '@/constants/habit-data'
import { RETRY_DELAY_MS, RETRY_MAX_ATTEMPTS } from '@/constants/retry'
import { cn } from '@/lib/utils'
import { getRingColorFromBackground } from '@/lib/utils/color'
import { appToast } from '@/lib/utils/toast'
import type { HabitWithProgress } from '@/types/habit'

// Drawerコンポーネントを動的にインポート
const HabitActionDrawer = dynamic(
  () => import('@/components/dashboard/HabitActionDrawer').then((mod) => mod.HabitActionDrawer),
  {
    ssr: false,
  }
)

interface HabitSimpleViewProps {
  habits: HabitWithProgress[]
  completedHabitIds: Set<string>
  onToggleHabit: (habitId: string) => void
  onAddHabit: () => void
  onArchiveOptimistic?: (habitId: string) => OptimisticRollback
  onDeleteOptimistic?: (habitId: string) => OptimisticRollback
  onResetOptimistic?: (habitId: string) => OptimisticRollback
  pendingCheckins?: Set<string>
  onSettings?: () => void
  backgroundColor?: string
}

function ProgressRing({
  progress,
  size = 140,
  strokeWidth = 6,
  progressColor,
  backgroundColor,
}: {
  progress: number
  size?: number
  strokeWidth?: number
  progressColor: string
  backgroundColor: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <svg aria-hidden="true" className="absolute inset-0 -rotate-90" height={size} width={size}>
      <circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke={backgroundColor} strokeWidth={strokeWidth} />
      <circle
        className="transition-all duration-500 ease-out"
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={radius}
        stroke={progressColor}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  )
}

export function HabitSimpleView({
  habits,
  completedHabitIds,
  onToggleHabit,
  onAddHabit,
  onArchiveOptimistic,
  onDeleteOptimistic,
  onResetOptimistic,
  pendingCheckins,
  onSettings,
  backgroundColor,
}: HabitSimpleViewProps) {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(0)
  const [resetConfirm, setResetConfirm] = useState<{ habitId: string; habitName: string } | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  const [drawerState, setDrawerState] = useState<{ open: boolean; habit: HabitWithProgress | null }>({
    open: false,
    habit: null,
  })
  const [drawerHabitId, setDrawerHabitId] = useState<string | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const longPressTriggeredRef = useRef(false)

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

  const ringBgColor = getRingColorFromBackground(bgColor)

  const handleProgressClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    habit: HabitWithProgress,
    isCompleted: boolean
  ) => {
    if (longPressTriggeredRef.current) {
      event.preventDefault()
      event.stopPropagation()
      longPressTriggeredRef.current = false
      return
    }
    if (isCompleted) {
      setResetConfirm({ habitId: habit.id, habitName: habit.name })
      return
    }
    onToggleHabit(habit.id)
  }

  const runResetWithRetry = async (habitId: string) => {
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

    return { ok: false as const, error: lastError }
  }

  const handleResetConfirm = async () => {
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
        setResetConfirm(null)
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
  }

  const openDrawer = (habit: HabitWithProgress) => {
    setDrawerHabitId(habit.id)
    setDrawerState({ open: true, habit })
  }

  const closeDrawer = () => {
    setDrawerState({ open: false, habit: null })
  }

  const handleLongPressStart = (habit: HabitWithProgress) => {
    longPressTriggeredRef.current = false
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true
      openDrawer(habit)
    }, 500)
  }

  const handleLongPressEnd = (resetTriggered: boolean) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (resetTriggered) {
      longPressTriggeredRef.current = false
    }
  }

  const handleContextMenu = (e: React.MouseEvent, habit: HabitWithProgress) => {
    e.preventDefault()
    longPressTriggeredRef.current = true
    openDrawer(habit)
  }

  const pages = useMemo(() => Array.from({ length: totalPages }, (_, page) => page), [totalPages])

  return (
    <div className="flex min-h-full flex-col transition-colors duration-500" style={{ backgroundColor: bgColor }}>
      <main className="flex flex-1 items-start justify-center px-4 pt-8 pb-24">
        <div className={cn('grid w-full max-w-md grid-cols-2 gap-6')}>
          {currentHabits.map((habit) => {
            const iconData = getIconById(normalizeIconName(habit.icon))
            const IconComponent = iconData.icon
            const progressPercent = Math.min((habit.currentProgress / habit.frequency) * 100, 100)
            const isCompleted = completedHabitIds.has(habit.id)
            const isPending = pendingCheckins?.has(habit.id) ?? false

            return (
              <div className="flex flex-col items-center gap-3" key={habit.id}>
                <Button
                  className="relative h-[140px] w-[140px] p-0 hover:bg-transparent"
                  disabled={isPending}
                  onClick={(event) => handleProgressClick(event, habit, isCompleted)}
                  onContextMenu={(e) => handleContextMenu(e, habit)}
                  onPointerCancel={() => handleLongPressEnd(true)}
                  onPointerDown={() => handleLongPressStart(habit)}
                  onPointerLeave={() => handleLongPressEnd(true)}
                  onPointerUp={() => handleLongPressEnd(false)}
                  scale="md"
                  type="button"
                  variant="ghost"
                >
                  <ProgressRing
                    backgroundColor={ringBgColor}
                    progress={progressPercent}
                    progressColor="rgba(255, 255, 255, 0.95)"
                    size={140}
                    strokeWidth={6}
                  />

                  <div
                    className={cn(
                      'flex h-[120px] w-[120px] items-center justify-center rounded-full transition-all duration-300',
                      isCompleted && 'scale-105'
                    )}
                    style={{
                      backgroundColor: bgColor,
                      boxShadow: isCompleted ? '0 0 20px rgba(255, 255, 255, 0.3)' : 'none',
                    }}
                  >
                    <IconComponent
                      className={cn(
                        'h-14 w-14 transition-all duration-300',
                        isCompleted ? 'text-white' : 'text-white/90'
                      )}
                      strokeWidth={1.5}
                    />
                  </div>
                </Button>

                <p
                  className={cn(
                    'max-w-[160px] text-center font-medium text-base text-white leading-tight',
                    isCompleted && 'opacity-80'
                  )}
                >
                  {habit.name}
                </p>
              </div>
            )
          })}

          <div className="flex flex-col items-center gap-3">
            <Button
              className="relative h-[140px] w-[140px] p-0 hover:bg-transparent"
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
                className="flex h-[120px] w-[120px] items-center justify-center rounded-full"
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
        onOpenChange={(open) => {
          if (!open) {
            closeDrawer()
          }
        }}
        onResetOptimistic={drawerHabitId && onResetOptimistic ? () => onResetOptimistic(drawerHabitId) : undefined}
        open={drawerState.open}
      />

      {resetConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Button
            aria-label="閉じる"
            className="absolute inset-0 h-full w-full bg-black/50 p-0 backdrop-blur-sm hover:bg-black/50"
            onClick={() => setResetConfirm(null)}
            type="button"
            variant="ghost"
          />

          <div className="relative w-full max-w-xs rounded-2xl bg-card p-6 shadow-2xl">
            <h3 className="mb-2 text-center font-semibold text-foreground text-lg">進捗をリセットしますか？</h3>
            <p className="mb-6 text-center text-muted-foreground text-sm">
              「{resetConfirm.habitName}」の今日のチェックインを削除して、進捗を0に戻します
            </p>

            <div className="flex gap-3">
              <Button
                className="flex-1 rounded-xl px-4 py-3"
                disabled={isResetting}
                onClick={() => setResetConfirm(null)}
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

      <nav className="fixed right-0 bottom-0 left-0 flex items-center justify-between px-6 py-4">
        <Button
          className="h-10 w-10 p-0 text-white/70 hover:bg-transparent hover:text-white"
          onClick={onSettings}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Icon className="h-6 w-6" name="settings" />
        </Button>

        {totalPages > 1 ? (
          <div className="flex items-center gap-2">
            {pages.map((page) => (
              <Button
                className={cn(
                  'h-2 w-2 rounded-full p-0 transition-all duration-300 hover:bg-transparent',
                  currentPage === page ? 'h-2.5 w-2.5 bg-white' : 'bg-white/40 hover:bg-white/60'
                )}
                key={`page-${page}`}
                onClick={() => setCurrentPage(page)}
                size="icon"
                type="button"
                variant="ghost"
              />
            ))}
          </div>
        ) : (
          <div className="h-2" />
        )}
      </nav>
    </div>
  )
}
