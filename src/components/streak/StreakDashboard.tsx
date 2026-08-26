'use client'

import { LayoutGrid, List } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { useMobileTabBarSlot } from '@/contexts/MobileTabBarSlotContext'
import { DashboardBackground } from './DashboardBackground'
import { HabitListView } from './HabitListView'
import { HabitSimpleView } from './HabitSimpleView'
import type { DashboardViewProps } from './types'
import { useDashboardContent } from './useDashboardContent'

export function StreakDashboard({
  habits,
  onAddCheckin,
  onRemoveCheckin,
  onArchiveOptimistic,
  onDeleteOptimistic,
  onResetOptimistic,
  onSkip,
  onUnSkip,
  todayLabel,
  currentView,
  onViewChange,
}: DashboardViewProps) {
  const {
    completedHabitIds,
    filteredHabits,
    handleAddHabit,
    periodFilter,
    setPeriodFilter,
    todayActive,
    totalDaily,
    totalStreak,
  } = useDashboardContent(habits)

  const handleViewToggle = useCallback(() => {
    onViewChange(currentView === 'simple' ? 'dashboard' : 'simple')
  }, [currentView, onViewChange])

  const nextViewLabel = currentView === 'simple' ? 'リスト' : 'グリッド'
  const NextViewIcon = currentView === 'simple' ? List : LayoutGrid
  const trailingSlot = (
    <button
      aria-label={`${nextViewLabel}表示に切り替え`}
      className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-foreground/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-accent/50"
      onClick={handleViewToggle}
      type="button"
    >
      <NextViewIcon aria-hidden="true" className="size-5 shrink-0" />
      <span className="truncate text-[10px] leading-none">{nextViewLabel}</span>
    </button>
  )

  useMobileTabBarSlot(trailingSlot)

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--dashboard-bg', 'var(--primary)')
    // iOS standalone の下端（ホームインジケータ周辺・オーバースクロール域）はここで塗る。
    // position:fixed は initial containing block までしか覆えずその外側に届かないため、
    // 以前ここに置いていた fixed inset-0 のレイヤーは SidebarInset の --dashboard-bg に
    // 完全に覆われて 1px も寄与していなかった（ブラウザで実測して削除済み）。
    // body も塗るのは、globals.css の `body { @apply bg-background }` が html の塗りを
    // 覆い隠すため（iOS Simulator の Web Inspector で実測: html=teal でも body=白が透けて
    // ページ下端の透明要素の背後に白帯が出た）。「重複だから」とどちらかを消すと再発する。
    root.style.backgroundColor = 'var(--primary)'
    document.body.style.backgroundColor = 'var(--primary)'

    return () => {
      root.style.removeProperty('--dashboard-bg')
      root.style.removeProperty('background-color')
      document.body.style.removeProperty('background-color')
    }
  }, [])

  return (
    <>
      {currentView === 'simple' ? (
        <HabitSimpleView
          backgroundColor="var(--primary)"
          completedHabitIds={completedHabitIds}
          habits={habits}
          onAddCheckin={onAddCheckin}
          onAddHabit={handleAddHabit}
          onArchiveOptimistic={onArchiveOptimistic}
          onDeleteOptimistic={onDeleteOptimistic}
          onRemoveCheckin={onRemoveCheckin}
          onResetOptimistic={onResetOptimistic}
          onSkip={onSkip}
          onUnSkip={onUnSkip}
        />
      ) : (
        <DashboardBackground>
          <HabitListView
            completedHabitIds={completedHabitIds}
            filteredHabits={filteredHabits}
            habits={habits}
            onAddCheckin={onAddCheckin}
            onAddHabit={handleAddHabit}
            onArchiveOptimistic={onArchiveOptimistic}
            onDeleteOptimistic={onDeleteOptimistic}
            onPeriodChange={setPeriodFilter}
            onRemoveCheckin={onRemoveCheckin}
            onResetOptimistic={onResetOptimistic}
            onSkip={onSkip}
            onUnSkip={onUnSkip}
            periodFilter={periodFilter}
            todayActive={todayActive}
            todayLabel={todayLabel}
            totalDaily={totalDaily}
            totalStreak={totalStreak}
          />
        </DashboardBackground>
      )}
    </>
  )
}
