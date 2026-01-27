'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon, normalizeIconName } from '@/components/Icon'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { DEFAULT_HABIT_COLOR } from '@/constants/habit'
import { getColorById, getIconById } from '@/constants/habit-data'
import { cn } from '@/lib/utils'
import { getRingColorFromBackground } from '@/lib/utils/color'
import type { HabitWithProgress } from '@/types/habit'

interface HabitSimpleViewProps {
  habits: HabitWithProgress[]
  completedHabitIds: Set<string>
  onToggleHabit: (habitId: string) => void
  onAddHabit: () => void
  onSettings?: () => void
  onArchive?: (habitId: string) => void
  onEdit?: (habitId: string) => void
  onDelete?: (habitId: string) => void
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
  onSettings,
  onArchive,
  onEdit,
  onDelete,
  backgroundColor,
}: HabitSimpleViewProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const [resetConfirm, setResetConfirm] = useState<{ habitId: string; habitName: string } | null>(null)
  const [actionDrawerOpen, setActionDrawerOpen] = useState(false)
  const [selectedHabit, setSelectedHabit] = useState<HabitWithProgress | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)

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

  const handleProgressClick = (habit: HabitWithProgress, isCheckedToday: boolean) => {
    if (isCheckedToday) {
      setResetConfirm({ habitId: habit.id, habitName: habit.name })
      return
    }
    onToggleHabit(habit.id)
  }

  const handleResetConfirm = () => {
    if (!resetConfirm) {
      return
    }
    onToggleHabit(resetConfirm.habitId)
    setResetConfirm(null)
  }

  const handleLongPressStart = (habit: HabitWithProgress) => {
    longPressTimerRef.current = setTimeout(() => {
      setSelectedHabit(habit)
      setActionDrawerOpen(true)
    }, 500)
  }

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleContextMenu = (e: React.MouseEvent, habit: HabitWithProgress) => {
    e.preventDefault()
    setSelectedHabit(habit)
    setActionDrawerOpen(true)
  }

  const handleActionDrawerClose = () => {
    setActionDrawerOpen(false)
    setSelectedHabit(null)
  }

  const handleEdit = () => {
    if (selectedHabit && onEdit) {
      onEdit(selectedHabit.id)
    }
    handleActionDrawerClose()
  }

  const handleArchive = () => {
    if (selectedHabit && onArchive) {
      onArchive(selectedHabit.id)
    }
    handleActionDrawerClose()
  }

  const handleDelete = () => {
    if (selectedHabit && onDelete) {
      onDelete(selectedHabit.id)
    }
    handleActionDrawerClose()
  }

  const pages = useMemo(() => Array.from({ length: totalPages }, (_, page) => page), [totalPages])

  return (
    <div className="flex min-h-screen flex-col transition-colors duration-500" style={{ backgroundColor: bgColor }}>
      <main className="flex flex-1 items-start justify-center px-4 pt-8 pb-24">
        <div className={cn('grid w-full max-w-md grid-cols-2 gap-6')}>
          {currentHabits.map((habit) => {
            const iconData = getIconById(normalizeIconName(habit.icon))
            const IconComponent = iconData.icon
            const progressPercent = Math.min((habit.currentProgress / habit.frequency) * 100, 100)
            const isCheckedToday = completedHabitIds.has(habit.id)
            const isCompleted = habit.currentProgress >= habit.frequency

            return (
              <div className="flex flex-col items-center gap-3" key={habit.id}>
                <button
                  className="relative flex h-[140px] w-[140px] items-center justify-center transition-transform hover:scale-105 active:scale-95"
                  onClick={() => handleProgressClick(habit, isCheckedToday)}
                  onContextMenu={(e) => handleContextMenu(e, habit)}
                  onPointerDown={() => handleLongPressStart(habit)}
                  onPointerLeave={handleLongPressEnd}
                  onPointerUp={handleLongPressEnd}
                  type="button"
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
                      isCheckedToday && 'scale-105'
                    )}
                    style={{
                      backgroundColor: bgColor,
                      boxShadow: isCheckedToday ? '0 0 20px rgba(255, 255, 255, 0.3)' : 'none',
                    }}
                  >
                    <IconComponent
                      className={cn(
                        'h-14 w-14 transition-all duration-300',
                        isCheckedToday ? 'text-white' : 'text-white/90'
                      )}
                      strokeWidth={1.5}
                    />
                  </div>
                </button>

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
            <button
              className="relative flex h-[140px] w-[140px] items-center justify-center transition-transform active:scale-95"
              onClick={onAddHabit}
              type="button"
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
            </button>

            <p className="text-center font-medium text-base text-white">タスクを追加</p>
          </div>
        </div>
      </main>

      {/* アクションDrawer */}
      <Drawer
        onOpenChange={(open) => {
          if (!open) {
            handleActionDrawerClose()
          }
        }}
        open={actionDrawerOpen}
      >
        <DrawerContent className="h-[70vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>習慣の操作</DrawerTitle>
            <DrawerDescription>{selectedHabit?.name}</DrawerDescription>
          </DrawerHeader>
          <div className="flex gap-2 p-4">
            {onEdit && (
              <Button className="flex-1" onClick={handleEdit} variant="outline">
                編集
              </Button>
            )}
            {onArchive && (
              <Button className="flex-1" onClick={handleArchive} variant="outline">
                アーカイブ
              </Button>
            )}
            {onDelete && (
              <Button className="flex-1 text-destructive" onClick={handleDelete} variant="outline">
                削除
              </Button>
            )}
          </div>
          <DrawerFooter className="pt-2">
            <Button className="w-full" onClick={handleActionDrawerClose} variant="outline">
              キャンセル
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {resetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="閉じる"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setResetConfirm(null)}
            type="button"
          />

          <div className="relative w-full max-w-xs rounded-2xl bg-card p-6 shadow-2xl">
            <h3 className="mb-2 text-center font-semibold text-foreground text-lg">チェックインを戻しますか？</h3>
            <p className="mb-6 text-center text-muted-foreground text-sm">
              「{resetConfirm.habitName}」を未完了に戻します
            </p>

            <div className="flex gap-3">
              <button
                className="flex-1 rounded-xl bg-secondary px-4 py-3 font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                onClick={() => setResetConfirm(null)}
                type="button"
              >
                キャンセル
              </button>
              <button
                className="flex-1 rounded-xl px-4 py-3 font-medium text-white transition-colors"
                onClick={handleResetConfirm}
                style={{ backgroundColor: bgColor }}
                type="button"
              >
                解除する
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed right-0 bottom-0 left-0 flex items-center justify-between px-6 py-4">
        <button
          className="flex h-10 w-10 items-center justify-center text-white/70 transition-colors hover:text-white"
          onClick={onSettings}
          type="button"
        >
          <Icon className="h-6 w-6" name="settings" />
        </button>

        {totalPages > 1 ? (
          <div className="flex items-center gap-2">
            {pages.map((page) => (
              <button
                className={cn(
                  'h-2 w-2 rounded-full transition-all duration-300',
                  currentPage === page ? 'h-2.5 w-2.5 bg-white' : 'bg-white/40 hover:bg-white/60'
                )}
                key={`page-${page}`}
                onClick={() => setCurrentPage(page)}
                type="button"
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
