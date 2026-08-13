'use client'

import { Calendar } from 'lucide-react'
import dynamic from 'next/dynamic'
import { type KeyboardEvent, useCallback, useMemo, useState } from 'react'
import { AddHabitButton } from '@/components/basics/Button'
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

type PeriodFilter = 'all' | Period

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

  // 件数はセグメント内に置かず、選択中フィルタの結果としてリスト見出し位置に 1 箇所だけ出す
  const countCaption = useMemo(() => {
    if (periodFilter === 'all') {
      return `${filteredHabits.length}件`
    }
    return `${filteredHabits.length}件 / 全${habits.length}件`
  }, [filteredHabits.length, habits.length, periodFilter])

  const sortedHabits = useMemo(() => {
    return filteredHabits.map((habit, index) => ({
      completed: completedHabitIds.has(habit.id),
      habit,
      index,
    }))
    // 完了状態によるソートを無効化（位置を保持してガタつきを防止）
  }, [filteredHabits, completedHabitIds])
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

        <PeriodSegmentedControl onChange={onPeriodChange} value={periodFilter} />

        <div className="space-y-3">
          {habits.length > 0 && <p className="px-1 text-white/80 text-xs tabular-nums">{countCaption}</p>}
          {filteredHabits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border/70 bg-card/80 shadow-sm">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mb-4 font-semibold text-base text-white">まだ習慣がありません</p>
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

const PERIOD_SEGMENTS: readonly { label: string; value: PeriodFilter }[] = [
  { label: 'すべて', value: 'all' },
  { label: PERIOD_DISPLAY_NAME.daily, value: 'daily' },
  { label: PERIOD_DISPLAY_NAME.weekly, value: 'weekly' },
  { label: PERIOD_DISPLAY_NAME.monthly, value: 'monthly' },
]

function arrowDelta(key: string) {
  if (key === 'ArrowRight' || key === 'ArrowDown') {
    return 1
  }
  if (key === 'ArrowLeft' || key === 'ArrowUp') {
    return -1
  }
  return 0
}

/**
 * iOS の UISegmentedControl に倣った期間フィルタ。
 * 凹んだ 1 本のトラックの中で、選択中のセグメントだけが手前の pill として浮く。
 */
function PeriodSegmentedControl({ onChange, value }: { onChange: (value: PeriodFilter) => void; value: PeriodFilter }) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const delta = arrowDelta(event.key)
      if (delta === 0) {
        return
      }
      event.preventDefault()
      const currentIndex = PERIOD_SEGMENTS.findIndex((segment) => segment.value === value)
      const nextIndex = (currentIndex + delta + PERIOD_SEGMENTS.length) % PERIOD_SEGMENTS.length
      onChange(PERIOD_SEGMENTS[nextIndex].value)
      // roving tabIndex ではフォーカスも一緒に動かさないとキーボード操作が行き止まりになる
      event.currentTarget.querySelectorAll('button')[nextIndex]?.focus()
    },
    [onChange, value]
  )

  return (
    <div
      aria-label="期間で絞り込む"
      className="flex items-stretch gap-1 rounded-full bg-black/20 p-1"
      onKeyDown={handleKeyDown}
      role="radiogroup"
    >
      {PERIOD_SEGMENTS.map((segment) => (
        <PeriodSegment
          active={value === segment.value}
          key={segment.value}
          label={segment.label}
          onSelect={onChange}
          value={segment.value}
        />
      ))}
    </div>
  )
}

function PeriodSegment({
  active,
  label,
  onSelect,
  value,
}: {
  active: boolean
  label: string
  onSelect: (value: PeriodFilter) => void
  value: PeriodFilter
}) {
  const handleClick = useCallback(() => onSelect(value), [onSelect, value])

  return (
    <button
      aria-checked={active}
      className={cn(
        // press で即時に反応させるため active: の opacity を使う（トラック内で pill が跳ねないよう scale は使わない）
        'flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-full px-1 font-medium text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:opacity-70',
        active ? 'bg-background text-foreground shadow-black/10 shadow-sm' : 'text-white'
      )}
      onClick={handleClick}
      role="radio"
      tabIndex={active ? 0 : -1}
      type="button"
    >
      <span className="truncate">{label}</span>
    </button>
  )
}
