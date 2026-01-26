'use client'

import { useState } from 'react'
import type { IconName } from '@/components/Icon'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/ui/button'
import type { HabitWithProgress } from '@/types/habit'
import { AddTaskSheet } from './AddTaskSheet'
import { HabitCard } from './HabitCard'

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

interface DesktopDashboardProps {
  habits: HabitWithProgress[]
  todayCheckins: Checkin[]
  user: User
  onAddHabit: (name: string, icon: IconName) => Promise<void>
  onToggleCheckin: (habitId: string) => Promise<void>
}

export function DesktopDashboard({ habits, todayCheckins, onAddHabit, onToggleCheckin }: DesktopDashboardProps) {
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false)

  const completedHabitIds = new Set(todayCheckins.map((c) => c.habitId))

  const handleAddHabit = async (name: string, icon: IconName) => {
    await onAddHabit(name, icon)
  }

  const handleToggleHabit = async (habitId: string) => {
    await onToggleCheckin(habitId)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-3xl">今日のタスク</h1>
        <Button onClick={() => setIsAddSheetOpen(true)}>
          <Icon className="mr-2 h-4 w-4" name="plus" />
          タスクを追加
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {habits.map((habit) => (
          <HabitCard
            completed={completedHabitIds.has(habit.id)}
            habit={habit}
            key={habit.id}
            onToggle={() => handleToggleHabit(habit.id)}
          />
        ))}
      </div>

      {habits.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <p>まだタスクがありません。</p>
          <p className="mt-2">「タスクを追加」ボタンから習慣を作成してください。</p>
        </div>
      )}

      <AddTaskSheet onOpenChange={setIsAddSheetOpen} onSubmit={handleAddHabit} open={isAddSheetOpen} />
    </div>
  )
}
