'use client'

import { Calendar } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback, useMemo, useState } from 'react'
import { AddHabitButton, Button } from '@/components/basics/Button'
import { DashboardStatsCard } from '@/components/dashboard/DashboardStatsCard'
import type { OptimisticRollback } from '@/components/habits/types'
import { HabitListCard } from '@/components/streak/HabitListCard'
import { PERIOD_DISPLAY_NAME, type Period } from '@/constants/habit'
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
  completedHabitIds: Set<string>
  filteredHabits: HabitWithProgress[]
  habits: HabitWithProgress[]
  onAddCheckin?: (habitId: string) => Promise<void>
  onAddHabit: () => void
  onArchiveOptimistic?: (habitId: string) => OptimisticRollback
  onDeleteOptimistic?: (habitId: string) => OptimisticRollback
  onPeriodChange: (filter: 'all' | Period) => void
  onRemoveCheckin?: (habitId: string) => Promise<void>
  onResetOptimistic?: (habitId: string) => OptimisticRollback
  onSkip?: (habitId: string) => Promise<void>
  onUnSkip?: (habitId: string) => Promise<void>
  periodFilter: 'all' | Period
  todayActive: number
  todayLabel: string
  totalDaily: number
  totalStreak: number
}

export function HabitListView({
  habits,
  filteredHabits,
  completedHabitIds,
  periodFilter,
  onPeriodChange,
  onAddCheckin,
  onRemoveCheckin,
  onAddHabit,
  onArchiveOptimistic,
  onDeleteOptimistic,
  onResetOptimistic,
  onSkip,
  onUnSkip,
  todayActive,
  todayLabel,
  totalDaily,
  totalStreak,
}: HabitListViewProps) {
  const [drawerState, setDrawerState] = useState<{ open: boolean; habit: HabitWithProgress | null }>({
    habit: null,
    open: false,
  })
  const [drawerHabitId, setDrawerHabitId] = useState<string | null>(null)

  const { dailyCount, weeklyCount, monthlyCount } = useMemo(
    () =>
      habits.reduce(
        (acc, habit) => {
          if (habit.period === 'daily') {
            acc.dailyCount += 1
          } else if (habit.period === 'weekly') {
            acc.weeklyCount += 1
          } else if (habit.period === 'monthly') {
            acc.monthlyCount += 1
          }
          return acc
        },
        { dailyCount: 0, monthlyCount: 0, weeklyCount: 0 }
      ),
    [habits]
  )

  const sortedHabits = useMemo(() => {
    return filteredHabits.map((habit, index) => ({
      completed: completedHabitIds.has(habit.id),
      habit,
      index,
    }))
    // 完了状態によるソートを無効化（位置を保持してガタつきを防止）
  }, [filteredHabits, completedHabitIds])
  const handleAllFilter = useCallback(() => onPeriodChange('all'), [onPeriodChange])
  const handleDailyFilter = useCallback(() => onPeriodChange('daily'), [onPeriodChange])
  const handleWeeklyFilter = useCallback(() => onPeriodChange('weekly'), [onPeriodChange])
  const handleMonthlyFilter = useCallback(() => onPeriodChange('monthly'), [onPeriodChange])
  const closeDrawer = useCallback((open: boolean) => {
    if (!open) {
      setDrawerState({ habit: null, open: false })
    }
  }, [])
  const openDrawer = useCallback((habit: HabitWithProgress) => {
    setDrawerHabitId(habit.id)
    setDrawerState({ habit, open: true })
  }, [])
  const archiveDrawerHabit = useCallback(
    () => (drawerHabitId && onArchiveOptimistic ? onArchiveOptimistic(drawerHabitId) : undefined),
    [drawerHabitId, onArchiveOptimistic]
  )
  const deleteDrawerHabit = useCallback(
    () => (drawerHabitId && onDeleteOptimistic ? onDeleteOptimistic(drawerHabitId) : undefined),
    [drawerHabitId, onDeleteOptimistic]
  )
  const resetDrawerHabit = useCallback(
    () => (drawerHabitId && onResetOptimistic ? onResetOptimistic(drawerHabitId) : undefined),
    [drawerHabitId, onResetOptimistic]
  )
  const skipDrawerHabit = useCallback(
    () => (drawerHabitId && onSkip ? onSkip(drawerHabitId) : Promise.resolve()),
    [drawerHabitId, onSkip]
  )
  const unskipDrawerHabit = useCallback(
    () => (drawerHabitId && onUnSkip ? onUnSkip(drawerHabitId) : Promise.resolve()),
    [drawerHabitId, onUnSkip]
  )

  return (
    <>
      <div className="flex-1 space-y-6 px-4 pt-4 pb-10">
        <header className="sticky top-0 z-20 overflow-hidden rounded-3xl border border-border/60 bg-background/80 px-4 py-4 shadow-black/5 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
          <div className="mb-4">
            <p className="text-foreground/70 text-xs tracking-wide">{todayLabel}</p>
            {/* ページの h1 は SiteHeader が持つ。ここはセクション見出しなので h2 */}
            <h2 className="font-semibold text-2xl text-foreground">今日の習慣</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DashboardStatsCard
              className="border-border/60 bg-card/90 shadow-sm"
              total={totalDaily}
              type="progress"
              value={todayActive}
            />
            <DashboardStatsCard
              className="border-border/60 bg-card/90 shadow-sm"
              suffix="日"
              type="streak"
              value={totalStreak}
            />
          </div>
        </header>

        <div className="grid grid-cols-4 gap-1.5">
          <FilterButton
            active={periodFilter === 'all'}
            count={habits.length}
            label="すべて"
            onClick={handleAllFilter}
          />
          <FilterButton
            active={periodFilter === 'daily'}
            count={dailyCount}
            label={PERIOD_DISPLAY_NAME.daily}
            onClick={handleDailyFilter}
          />
          <FilterButton
            active={periodFilter === 'weekly'}
            count={weeklyCount}
            label={PERIOD_DISPLAY_NAME.weekly}
            onClick={handleWeeklyFilter}
          />
          <FilterButton
            active={periodFilter === 'monthly'}
            count={monthlyCount}
            label={PERIOD_DISPLAY_NAME.monthly}
            onClick={handleMonthlyFilter}
          />
        </div>

        <div className="space-y-3">
          {filteredHabits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border/70 bg-card/80 shadow-sm">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mb-4 font-semibold text-base text-foreground">まだ習慣がありません</p>
              <AddHabitButton onClick={onAddHabit}>習慣を追加</AddHabitButton>
            </div>
          ) : (
            sortedHabits.map(({ habit, completed }) => (
              <HabitListCardItem
                completed={completed}
                habit={habit}
                key={habit.id}
                onAddCheckin={onAddCheckin}
                onOpenDrawer={openDrawer}
                onRemoveCheckin={onRemoveCheckin}
              />
            ))
          )}
          {filteredHabits.length > 0 && (
            <div className="mt-6 flex justify-center">
              <AddHabitButton onClick={onAddHabit}>習慣を追加</AddHabitButton>
            </div>
          )}
        </div>

        <div className="h-24" />
      </div>

      {/* アクションDrawer */}
      <HabitActionDrawer
        habit={drawerState.habit}
        onArchiveOptimistic={drawerHabitId && onArchiveOptimistic ? archiveDrawerHabit : undefined}
        onDeleteOptimistic={drawerHabitId && onDeleteOptimistic ? deleteDrawerHabit : undefined}
        onOpenChange={closeDrawer}
        onResetOptimistic={drawerHabitId && onResetOptimistic ? resetDrawerHabit : undefined}
        onSkip={drawerHabitId && onSkip ? skipDrawerHabit : undefined}
        onUnSkip={drawerHabitId && onUnSkip ? unskipDrawerHabit : undefined}
        open={drawerState.open}
      />
    </>
  )
}

function HabitListCardItem({
  completed,
  habit,
  onAddCheckin,
  onOpenDrawer,
  onRemoveCheckin,
}: {
  completed: boolean
  habit: HabitWithProgress
  onAddCheckin?: (habitId: string) => Promise<void>
  onOpenDrawer: (habit: HabitWithProgress) => void
  onRemoveCheckin?: (habitId: string) => Promise<void>
}) {
  const handleAdd = useCallback(() => onAddCheckin?.(habit.id), [habit.id, onAddCheckin])
  const handleOpenDrawer = useCallback(() => onOpenDrawer(habit), [habit, onOpenDrawer])
  const handleRemove = useCallback(() => onRemoveCheckin?.(habit.id), [habit.id, onRemoveCheckin])
  return (
    <HabitListCard
      completed={completed}
      dimmed={completed}
      habit={habit}
      onAdd={onAddCheckin ? handleAdd : undefined}
      onLongPressOrContextMenu={handleOpenDrawer}
      onRemove={onRemoveCheckin ? handleRemove : undefined}
    />
  )
}

function FilterButton({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean
  count: number
  label: string
  onClick: () => void
}) {
  return (
    <Button
      aria-pressed={active}
      className={cn(
        'flex h-11 min-w-0 flex-col items-center justify-center gap-0 rounded-full px-1 py-1.5 font-medium leading-tight transition-all duration-200',
        active
          ? 'bg-foreground text-background shadow-sm'
          : 'border border-border/60 bg-background/70 text-muted-foreground hover:bg-background/90 hover:text-foreground'
      )}
      onClick={onClick}
      type="button"
      variant="ghost"
    >
      <span className="w-full truncate text-center text-[11px] sm:text-xs">{label}</span>
      <span className="text-[10px] opacity-80 sm:text-[11px]">{count}</span>
    </Button>
  )
}
