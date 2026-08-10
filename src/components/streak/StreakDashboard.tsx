'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'
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
    // position:fixed は initial containing block までしか覆えず、iOS standalone では
    // その外側（ホームインジケータ周辺・オーバースクロール域）に body の色が残る。
    // キャンバスを塗る html 自身に色を置くことでその領域まで届かせる。
    root.style.backgroundColor = 'var(--primary)'

    return () => {
      root.style.removeProperty('--dashboard-bg')
      root.style.removeProperty('background-color')
    }
  }, [])

  return (
    <>
      {/*
       * ビュー背景は min-h-full の連鎖で塗っているため、iOS standalone では
       * safe-area 分だけ下端に body の色が露出する。viewport 全面を同色で
       * 埋める固定レイヤーを敷いて高さ計算に依存させない。
       */}
      <div aria-hidden className="fixed inset-0 -z-10" style={{ backgroundColor: 'var(--primary)' }} />
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
          onSettings={() => onViewChange('dashboard')}
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

      <div
        className={cn(
          'fixed right-4 z-50',
          // simple ビューのみ下部固定 nav があるため、その分を回避する
          currentView === 'simple'
            ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))]'
            : 'bottom-[calc(1.5rem+env(safe-area-inset-bottom))]'
        )}
      >
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
