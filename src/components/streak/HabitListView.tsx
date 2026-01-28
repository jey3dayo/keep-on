'use client'

import { Calendar } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { AddHabitButton, Button, CheckInButton } from '@/components/basics/Button'
import { Icon, normalizeIconName } from '@/components/basics/Icon'
import { DashboardStatsCard } from '@/components/dashboard/DashboardStatsCard'
import { HabitResetDialog } from '@/components/habits/HabitResetDialog'
import { DEFAULT_HABIT_COLOR, PERIOD_DISPLAY_NAME, type Period } from '@/constants/habit'
import { getColorById, getIconById, getPeriodById } from '@/constants/habit-data'
import { cn } from '@/lib/utils'
import type { HabitWithProgress } from '@/types/habit'

// Drawerコンポーネントを動的にインポート
const HabitActionDrawer = dynamic(
  () => import('@/components/dashboard/HabitActionDrawer').then((mod) => mod.HabitActionDrawer),
  {
    ssr: false,
  }
)

interface HabitListViewProps {
  habits: HabitWithProgress[]
  filteredHabits: HabitWithProgress[]
  completedHabitIds: Set<string>
  periodFilter: 'all' | Period
  onPeriodChange: (filter: 'all' | Period) => void
  onToggleHabit: (habitId: string) => void
  onAddHabit: () => void
  todayCompleted: number
  totalDaily: number
  totalStreak: number
}

export function HabitListView({
  habits,
  filteredHabits,
  completedHabitIds,
  periodFilter,
  onPeriodChange,
  onToggleHabit,
  onAddHabit,
  todayCompleted,
  totalDaily,
  totalStreak,
}: HabitListViewProps) {
  const [drawerState, setDrawerState] = useState<{ open: boolean; habit: HabitWithProgress | null }>({
    open: false,
    habit: null,
  })
  const [resetConfirmHabit, setResetConfirmHabit] = useState<HabitWithProgress | null>(null)
  const previousCompletedIds = useRef<Set<string>>(completedHabitIds)
  const habitsRef = useRef(habits)

  useEffect(() => {
    habitsRef.current = habits
  }, [habits])

  // 達成検知: 新たに達成した習慣があれば確認ダイアログを表示
  useEffect(() => {
    const newlyCompleted = Array.from(completedHabitIds).filter((id) => !previousCompletedIds.current.has(id))
    if (newlyCompleted.length > 0) {
      const newlyCompletedHabit = habitsRef.current.find((h) => h.id === newlyCompleted[0])
      if (newlyCompletedHabit) {
        setResetConfirmHabit(newlyCompletedHabit)
      }
    }
    previousCompletedIds.current = new Set(completedHabitIds)
  }, [completedHabitIds])

  const today = new Date()
  const dayNames = ['日', '月', '火', '水', '木', '金', '土']
  const currentDayName = dayNames[today.getDay()]

  const dailyCount = habits.filter((h) => h.period === 'daily').length
  const weeklyCount = habits.filter((h) => h.period === 'weekly').length
  const monthlyCount = habits.filter((h) => h.period === 'monthly').length

  return (
    <>
      <div className="flex-1 space-y-6 px-4 pt-4 pb-8">
        <header className="sticky top-0 z-10 rounded-2xl border border-border/50 bg-background/50 px-4 py-4 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/30">
          <div className="mb-4">
            <p className="text-foreground text-sm">
              {today.getMonth() + 1}月{today.getDate()}日（{currentDayName}）
            </p>
            <h1 className="font-bold text-2xl text-foreground">今日の習慣</h1>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DashboardStatsCard total={totalDaily} type="progress" value={todayCompleted} />
            <DashboardStatsCard suffix="日" type="streak" value={totalStreak} />
          </div>
        </header>

        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
          <FilterButton active={periodFilter === 'all'} onClick={() => onPeriodChange('all')}>
            すべて ({habits.length})
          </FilterButton>
          <FilterButton active={periodFilter === 'daily'} onClick={() => onPeriodChange('daily')}>
            {PERIOD_DISPLAY_NAME.daily} ({dailyCount})
          </FilterButton>
          <FilterButton active={periodFilter === 'weekly'} onClick={() => onPeriodChange('weekly')}>
            {PERIOD_DISPLAY_NAME.weekly} ({weeklyCount})
          </FilterButton>
          <FilterButton active={periodFilter === 'monthly'} onClick={() => onPeriodChange('monthly')}>
            {PERIOD_DISPLAY_NAME.monthly} ({monthlyCount})
          </FilterButton>
        </div>

        <div className="space-y-3">
          {filteredHabits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mb-4 font-semibold text-base text-foreground">まだ習慣がありません</p>
              <AddHabitButton onClick={onAddHabit}>習慣を追加</AddHabitButton>
            </div>
          ) : (
            filteredHabits.map((habit) => (
              <HabitListCard
                completed={completedHabitIds.has(habit.id)}
                habit={habit}
                key={habit.id}
                onLongPressOrContextMenu={() => setDrawerState({ open: true, habit })}
                onToggle={() => onToggleHabit(habit.id)}
              />
            ))
          )}
        </div>

        {filteredHabits.length > 0 && (
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2">
            <AddHabitButton onClick={onAddHabit}>習慣を追加</AddHabitButton>
          </div>
        )}

        <div className="h-20" />
      </div>

      {/* アクションDrawer */}
      <HabitActionDrawer
        habit={drawerState.habit}
        onOpenChange={(open) => {
          if (!open) {
            setDrawerState({ open: false, habit: null })
          }
        }}
        open={drawerState.open}
      />
      {/* リセット確認ダイアログ（達成時のみ表示） */}
      {resetConfirmHabit && (
        <HabitResetDialog
          habitId={resetConfirmHabit.id}
          habitName={resetConfirmHabit.name}
          onOpenChange={(open) => {
            if (!open) {
              setResetConfirmHabit(null)
            }
          }}
          open
          trigger={null}
        />
      )}
    </>
  )
}

function FilterButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <Button
      className={cn(
        'h-auto rounded-full px-4 py-2',
        active ? 'bg-foreground text-background' : 'border border-border bg-card text-muted-foreground hover:bg-card/80'
      )}
      onClick={onClick}
      type="button"
      variant="ghost"
    >
      {children}
    </Button>
  )
}

function HabitListCard({
  habit,
  completed,
  onToggle,
  onLongPressOrContextMenu,
}: {
  habit: HabitWithProgress
  completed: boolean
  onToggle: () => void
  onLongPressOrContextMenu: () => void
}) {
  const colorData = getColorById(habit.color ?? DEFAULT_HABIT_COLOR)
  const periodData = getPeriodById(habit.period)
  const IconComponent = getIconById(normalizeIconName(habit.icon)).icon
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)

  const isCompleted = habit.currentProgress >= habit.frequency
  const progressPercent = Math.min((habit.currentProgress / habit.frequency) * 100, 100)

  const handleLongPressStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      onLongPressOrContextMenu()
    }, 500)
  }

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    onLongPressOrContextMenu()
  }

  return (
    <div
      className={cn(
        'rounded-2xl border bg-card p-4 transition-all duration-300',
        completed ? 'border-border/50' : 'border-border'
      )}
      onContextMenu={handleContextMenu}
      onPointerDown={handleLongPressStart}
      onPointerLeave={handleLongPressEnd}
      onPointerUp={handleLongPressEnd}
      role="button"
      style={{
        borderColor: completed ? colorData.color : undefined,
        backgroundColor: completed ? `${colorData.color}10` : undefined,
      }}
      tabIndex={0}
    >
      <div className="flex items-center gap-4">
        <CheckInButton
          completed={completed}
          onClick={onToggle}
          style={
            {
              backgroundColor: colorData.color,
              opacity: completed ? 1 : 0.85,
              '--tw-ring-color': colorData.color,
            } as CSSProperties
          }
        >
          {completed ? (
            <Icon className="h-7 w-7 text-background" name="check" />
          ) : (
            <IconComponent className="h-7 w-7 text-background" />
          )}
        </CheckInButton>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3
              className={cn(
                'truncate font-semibold text-foreground text-lg transition-colors',
                completed && 'text-muted-foreground line-through'
              )}
            >
              {habit.name}
            </h3>
            <span
              className="flex-shrink-0 rounded-full px-2 py-0.5 text-xs"
              style={{
                backgroundColor: `${colorData.color}20`,
                color: colorData.color,
              }}
            >
              {periodData.label}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: colorData.color,
                }}
              />
            </div>
            <span className="whitespace-nowrap text-muted-foreground text-sm">
              {habit.currentProgress} / {habit.frequency}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1">
            <Icon className="h-4 w-4" name="flame" style={{ color: habit.streak > 0 ? colorData.color : undefined }} />
            <span className="font-bold text-lg" style={{ color: habit.streak > 0 ? colorData.color : undefined }}>
              {habit.streak}
            </span>
          </div>
          <span className="text-muted-foreground text-xs">日連続</span>
        </div>
      </div>

      {!isCompleted && habit.frequency > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 border-border border-t pt-3 text-muted-foreground text-xs">
          次のチェックインで完了
        </div>
      )}
    </div>
  )
}
