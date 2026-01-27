'use client'

import { useState } from 'react'
import type { IconName } from '@/components/Icon'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PERIOD_DISPLAY_NAME } from '@/constants/habit'
import { filterHabitsByPeriod } from '@/lib/utils/habits'
import type { HabitWithProgress } from '@/types/habit'
import { AddTaskSheet } from './AddTaskSheet'
import { DashboardHeader } from './DashboardHeader'
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
  // TODO: 編集・削除機能の実装 (https://github.com/jey3dayo/keep-on/issues/46)
  // onUpdateHabit?: (habitId: string, updates: Partial<HabitWithProgress>) => Promise<void>
  // onDeleteHabit?: (habitId: string) => Promise<void>
}

type PeriodFilter = 'all' | 'daily' | 'weekly' | 'monthly'

export function DesktopDashboard({ habits, todayCheckins, onAddHabit, onToggleCheckin }: DesktopDashboardProps) {
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')

  const completedHabitIds = new Set(todayCheckins.map((c) => c.habitId))

  // 期間フィルター適用
  const filteredHabits = filterHabitsByPeriod(habits, periodFilter)

  // 統計計算
  const dailyHabits = habits.filter((h) => h.period === 'daily')
  const todayCompleted = dailyHabits.filter((h) => h.currentProgress >= h.frequency).length
  const totalDaily = dailyHabits.length
  const totalStreak = habits.reduce((sum, h) => sum + h.streak, 0)

  const handleAddHabit = async (name: string, icon: IconName) => {
    await onAddHabit(name, icon)
  }

  const handleToggleHabit = async (habitId: string) => {
    await onToggleCheckin(habitId)
  }

  return (
    <div className="space-y-6 p-6">
      {/* ヘッダーと統計カード */}
      <DashboardHeader
        onAddClick={() => setIsAddSheetOpen(true)}
        todayCompleted={todayCompleted}
        totalDaily={totalDaily}
        totalStreak={totalStreak}
        variant="desktop"
      />

      {/* 期間フィルター */}
      <Tabs defaultValue="all" onValueChange={(v) => setPeriodFilter(v as PeriodFilter)} value={periodFilter}>
        <TabsList className="w-auto">
          <TabsTrigger value="all">すべて</TabsTrigger>
          <TabsTrigger value="daily">{PERIOD_DISPLAY_NAME.daily}</TabsTrigger>
          <TabsTrigger value="weekly">{PERIOD_DISPLAY_NAME.weekly}</TabsTrigger>
          <TabsTrigger value="monthly">{PERIOD_DISPLAY_NAME.monthly}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ハビットカードグリッド */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {filteredHabits.map((habit) => (
          <HabitCard
            completed={completedHabitIds.has(habit.id)}
            habit={habit}
            key={habit.id}
            onToggle={() => handleToggleHabit(habit.id)}
            // TODO: 編集・削除機能の実装 (https://github.com/jey3dayo/keep-on/issues/46)
            // onEdit={() => handleEditHabit(habit.id)}
            // onDelete={() => handleDeleteHabit(habit.id)}
          />
        ))}
      </div>

      {filteredHabits.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <p>表示する習慣がありません。</p>
          <p className="mt-2">「追加」ボタンから習慣を作成してください。</p>
        </div>
      )}

      <AddTaskSheet onOpenChange={setIsAddSheetOpen} onSubmit={handleAddHabit} open={isAddSheetOpen} />
    </div>
  )
}
