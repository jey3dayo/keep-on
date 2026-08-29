'use client'

import { DesktopDashboard } from '@/components/streak/DesktopDashboard'
import { StreakDashboard } from '@/components/streak/StreakDashboard'
import { useHabitCheckinQueue } from '@/hooks/useHabitCheckinQueue'
import { selectTodayHabits } from '@/lib/utils/habits'
import type { HabitWithProgress } from '@/types/habit'
import type { User } from '@/types/user'

interface DashboardWrapperProps {
  habits: HabitWithProgress[]
  todayLabel: string
  user: User
}

export function DashboardWrapper({ habits, todayLabel, user }: DashboardWrapperProps) {
  const {
    archiveOptimistically,
    deleteOptimistically,
    handleAddCheckin,
    handleRemoveCheckin,
    handleSkip,
    handleUnSkip,
    optimisticHabits,
    resetOptimistically,
  } = useHabitCheckinQueue(habits)
  const todayHabits = selectTodayHabits(optimisticHabits)

  return (
    <>
      {/* スマホ版: STREAK風フルスクリーンUI */}
      <div className="flex-1 md:hidden">
        <StreakDashboard
          habits={todayHabits}
          onAddCheckin={handleAddCheckin}
          onArchiveOptimistic={archiveOptimistically}
          onDeleteOptimistic={deleteOptimistically}
          onRemoveCheckin={handleRemoveCheckin}
          onResetOptimistic={resetOptimistically}
          onSkip={handleSkip}
          onUnSkip={handleUnSkip}
          todayLabel={todayLabel}
        />
      </div>

      {/* PC版: shadcn/ui Cardレイアウト */}
      <div className="hidden flex-1 md:block">
        <DesktopDashboard
          habits={todayHabits}
          onAddCheckin={handleAddCheckin}
          onArchiveOptimistic={archiveOptimistically}
          onDeleteOptimistic={deleteOptimistically}
          onRemoveCheckin={handleRemoveCheckin}
          onResetOptimistic={resetOptimistically}
          onSkip={handleSkip}
          onUnSkip={handleUnSkip}
          todayLabel={todayLabel}
          user={user}
        />
      </div>
    </>
  )
}
