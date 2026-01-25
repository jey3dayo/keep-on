'use client'

import { useState } from 'react'
import type { IconName } from '@/components/Icon'
import { useColorTheme } from '@/hooks/use-color-theme'
import { AddTaskSheet } from './AddTaskSheet'
import { StreakToolbar } from './StreakToolbar'
import { TaskGrid } from './TaskGrid'

interface Habit {
  id: string
  name: string
  icon: string | null
  userId: string
  createdAt: Date
  updatedAt: Date
}

interface Checkin {
  id: string
  habitId: string
  date: Date
  createdAt: Date
}

interface User {
  id: string
  clerkId: string
  email: string
  createdAt: Date
  updatedAt: Date
}

interface StreakDashboardProps {
  habits: Habit[]
  todayCheckins: Checkin[]
  user: User
  onAddHabit: (name: string, icon: IconName) => Promise<void>
  onToggleCheckin: (habitId: string) => Promise<void>
}

export function StreakDashboard({ habits, todayCheckins, onAddHabit, onToggleCheckin }: StreakDashboardProps) {
  const { theme, setTheme } = useColorTheme()
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false)

  const completedHabitIds = new Set(todayCheckins.map((c) => c.habitId))

  const handleAddHabit = async (name: string, icon: IconName) => {
    await onAddHabit(name, icon)
  }

  const handleToggleHabit = async (habitId: string) => {
    await onToggleCheckin(habitId)
  }

  const handleSettingsClick = () => {
    // 将来的に設定画面を実装
    console.log('Settings clicked')
  }

  return (
    <div className="streak-bg flex h-screen flex-col">
      <TaskGrid
        completedHabitIds={completedHabitIds}
        habits={habits}
        onAddClick={() => setIsAddSheetOpen(true)}
        onToggleHabit={handleToggleHabit}
      />
      <StreakToolbar currentTheme={theme} onSettingsClick={handleSettingsClick} onThemeChange={setTheme} />
      <AddTaskSheet onOpenChange={setIsAddSheetOpen} onSubmit={handleAddHabit} open={isAddSheetOpen} />
    </div>
  )
}
