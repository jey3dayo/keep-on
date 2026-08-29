'use client'

import { useEffect } from 'react'
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
}: DashboardViewProps) {
  const { completedHabitIds, handleAddHabit, todayActive, totalDaily } = useDashboardContent(habits)

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
      todayActive={todayActive}
      todayLabel={todayLabel}
      totalDaily={totalDaily}
    />
  )
}
