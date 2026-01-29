'use client'

import { Calendar } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { AddHabitButton, Button } from '@/components/basics/Button'
import { DashboardStatsCard } from '@/components/dashboard/DashboardStatsCard'
import { HabitResetDialog } from '@/components/habits/HabitResetDialog'
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
  habits: HabitWithProgress[]
  filteredHabits: HabitWithProgress[]
  completedHabitIds: Set<string>
  periodFilter: 'all' | Period
  onPeriodChange: (filter: 'all' | Period) => void
  onToggleHabit: (habitId: string) => void
  onAddHabit: () => void
  onArchiveOptimistic?: (habitId: string) => OptimisticRollback
  onDeleteOptimistic?: (habitId: string) => OptimisticRollback
  onResetOptimistic?: (habitId: string) => OptimisticRollback
  pendingCheckins?: Set<string>
  todayCompleted: number
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
  onToggleHabit,
  onAddHabit,
  onArchiveOptimistic,
  onDeleteOptimistic,
  onResetOptimistic,
  pendingCheckins,
  todayCompleted,
  todayLabel,
  totalDaily,
  totalStreak,
}: HabitListViewProps) {
  const [drawerState, setDrawerState] = useState<{ open: boolean; habit: HabitWithProgress | null }>({
    open: false,
    habit: null,
  })
  const [resetConfirmHabit, setResetConfirmHabit] = useState<HabitWithProgress | null>(null)
  const [drawerHabitId, setDrawerHabitId] = useState<string | null>(null)

  const dailyCount = habits.filter((h) => h.period === 'daily').length
  const weeklyCount = habits.filter((h) => h.period === 'weekly').length
  const monthlyCount = habits.filter((h) => h.period === 'monthly').length

  return (
    <>
      <div className="flex-1 space-y-6 px-4 pt-4 pb-10">
        <header className="sticky top-0 z-20 rounded-2xl border border-border/60 bg-background/80 px-4 py-4 shadow-black/5 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
          <div className="mb-4">
            <p className="text-muted-foreground text-xs tracking-wide">{todayLabel}</p>
            <h1 className="font-semibold text-2xl text-foreground">今日の習慣</h1>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DashboardStatsCard
              className="border-border/60 bg-card/90 shadow-sm"
              total={totalDaily}
              type="progress"
              value={todayCompleted}
            />
            <DashboardStatsCard
              className="border-border/60 bg-card/90 shadow-sm"
              suffix="日"
              type="streak"
              value={totalStreak}
            />
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
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border/70 bg-card/80 shadow-sm">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mb-4 font-semibold text-base text-foreground">まだ習慣がありません</p>
              <AddHabitButton onClick={onAddHabit}>習慣を追加</AddHabitButton>
            </div>
          ) : (
            [...filteredHabits]
              .map((habit, index) => ({ habit, index }))
              .sort((a, b) => {
                const aCompleted = completedHabitIds.has(a.habit.id)
                const bCompleted = completedHabitIds.has(b.habit.id)
                if (aCompleted !== bCompleted) {
                  return Number(aCompleted) - Number(bCompleted)
                }
                return a.index - b.index
              })
              .map(({ habit }) => (
                <HabitListCard
                  completed={completedHabitIds.has(habit.id)}
                  dimmed={completedHabitIds.has(habit.id)}
                  habit={habit}
                  key={habit.id}
                  onLongPressOrContextMenu={() => {
                    setDrawerHabitId(habit.id)
                    setDrawerState({ open: true, habit })
                  }}
                  onToggle={() => {
                    if (completedHabitIds.has(habit.id)) {
                      setResetConfirmHabit(habit)
                      return
                    }
                    onToggleHabit(habit.id)
                  }}
                  pending={pendingCheckins?.has(habit.id) ?? false}
                />
              ))
          )}
        </div>

        {filteredHabits.length > 0 && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
            <div className="rounded-full border border-border/60 bg-background/80 p-1 shadow-lg backdrop-blur">
              <AddHabitButton className="shadow-none" onClick={onAddHabit}>
                習慣を追加
              </AddHabitButton>
            </div>
          </div>
        )}

        <div className="h-24" />
      </div>

      {/* アクションDrawer */}
      <HabitActionDrawer
        habit={drawerState.habit}
        onArchiveOptimistic={
          drawerHabitId && onArchiveOptimistic ? () => onArchiveOptimistic(drawerHabitId) : undefined
        }
        onDeleteOptimistic={drawerHabitId && onDeleteOptimistic ? () => onDeleteOptimistic(drawerHabitId) : undefined}
        onOpenChange={(open) => {
          if (!open) {
            setDrawerState({ open: false, habit: null })
          }
        }}
        onResetOptimistic={drawerHabitId && onResetOptimistic ? () => onResetOptimistic(drawerHabitId) : undefined}
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
          onOptimistic={onResetOptimistic ? () => onResetOptimistic(resetConfirmHabit.id) : undefined}
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
      aria-pressed={active}
      className={cn(
        'h-auto rounded-full px-4 py-2 font-medium text-sm transition-all duration-200',
        active
          ? 'bg-foreground text-background shadow-sm'
          : 'border border-border/60 bg-background/70 text-muted-foreground hover:bg-background/90 hover:text-foreground'
      )}
      onClick={onClick}
      type="button"
      variant="ghost"
    >
      {children}
    </Button>
  )
}
