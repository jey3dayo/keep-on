'use client'

import { useEffect } from 'react'
import { DashboardViewToggle } from './DashboardViewToggle'
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
        <div className="streak-bg flex min-h-full flex-col" style={{ backgroundColor: 'var(--primary)' }}>
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
        </div>
      )}

      <div className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40">
        <div className="flex items-center gap-3">
          <DashboardViewToggle
            activeButtonClassName="bg-foreground text-background"
            buttonClassName="rounded-full p-2 transition-all"
            currentView={currentView}
            inactiveButtonClassName="text-muted-foreground"
            onViewChange={onViewChange}
          />
        </div>
      </div>
    </>
  )
}
