'use client'

import { useState } from 'react'
import type { IconName } from '@/components/Icon'
import type { Period } from '@/constants/habit'
import type { HabitPreset } from '@/constants/habit-data'
import { filterHabitsByPeriod } from '@/lib/utils/habits'
import type { HabitWithProgress } from '@/types/habit'
import { HabitForm } from './HabitForm'
import { HabitListView } from './HabitListView'

interface Checkin {
  id: string
  habitId: string
  date: string
  createdAt: Date
}

interface User {
  id: string
  clerkId: string
  email: string
  createdAt: Date
  updatedAt: Date
}

interface DesktopDashboardProps {
  habits: HabitWithProgress[]
  todayCheckins: Checkin[]
  user: User
  onAddHabit: (
    name: string,
    icon: IconName,
    options?: { color?: string | null; period?: Period; frequency?: number }
  ) => Promise<void>
  onToggleCheckin: (habitId: string) => Promise<void>
}

type PeriodFilter = 'all' | Period
type View = 'dashboard' | 'add'

export function DesktopDashboard({ habits, todayCheckins, onAddHabit, onToggleCheckin }: DesktopDashboardProps) {
  const [currentView, setCurrentView] = useState<View>('dashboard')
  const [selectedPreset, setSelectedPreset] = useState<HabitPreset | null>(null)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')

  const completedHabitIds = new Set(todayCheckins.map((c) => c.habitId))

  // 期間フィルター適用
  const filteredHabits = filterHabitsByPeriod(habits, periodFilter)

  // 統計計算
  const dailyHabits = habits.filter((h) => h.period === 'daily')
  const todayCompleted = dailyHabits.filter((h) => h.currentProgress >= h.frequency).length
  const totalDaily = dailyHabits.length
  const totalStreak = habits.reduce((sum, h) => sum + h.streak, 0)

  const handleAddHabit = async (
    name: string,
    icon: IconName,
    options?: { color?: string | null; period?: Period; frequency?: number }
  ) => {
    await onAddHabit(name, icon, options)
  }

  const handleToggleHabit = async (habitId: string) => {
    await onToggleCheckin(habitId)
  }

  if (currentView === 'add') {
    return (
      <HabitForm
        onBack={() => {
          setSelectedPreset(null)
          setCurrentView('dashboard')
        }}
        onSubmit={async (input) => {
          await handleAddHabit(input.name, input.icon, {
            color: input.color,
            period: input.period,
            frequency: input.frequency,
          })
          setSelectedPreset(null)
          setCurrentView('dashboard')
        }}
        preset={selectedPreset}
      />
    )
  }

  return (
    <div className="space-y-6 p-6">
      <HabitListView
        completedHabitIds={completedHabitIds}
        filteredHabits={filteredHabits}
        habits={habits}
        onAddHabit={() => setCurrentView('add')}
        onPeriodChange={setPeriodFilter}
        onToggleHabit={handleToggleHabit}
        periodFilter={periodFilter}
        todayCompleted={todayCompleted}
        totalDaily={totalDaily}
        totalStreak={totalStreak}
      />
    </div>
  )
}
