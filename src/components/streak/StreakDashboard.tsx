'use client'

import { useState } from 'react'
import type { IconName } from '@/components/Icon'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PERIOD_DISPLAY_NAME } from '@/constants/habit'
import { useColorTheme } from '@/hooks/use-color-theme'
import type { HabitWithProgress } from '@/types/habit'
import { AddTaskSheet } from './AddTaskSheet'
import { StreakToolbar } from './StreakToolbar'
import { TaskGrid } from './TaskGrid'

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
  habits: HabitWithProgress[]
  todayCheckins: Checkin[]
  user: User
  onAddHabit: (name: string, icon: IconName) => Promise<void>
  onToggleCheckin: (habitId: string) => Promise<void>
}

type PeriodFilter = 'all' | 'daily' | 'weekly' | 'monthly'

export function StreakDashboard({ habits, todayCheckins, onAddHabit, onToggleCheckin }: StreakDashboardProps) {
  const { theme, setTheme, ready } = useColorTheme()
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')

  const completedHabitIds = new Set(todayCheckins.map((c) => c.habitId))

  // 期間フィルター適用
  const filteredHabits = filterHabitsByPeriod(habits, periodFilter)

  // 統計計算
  const todayCompleted = filteredHabits.filter((h) => h.currentProgress >= h.frequency).length
  const totalStreak = filteredHabits.reduce((sum, h) => sum + h.streak, 0)

  const handleAddHabit = async (name: string, icon: IconName) => {
    await onAddHabit(name, icon)
  }

  const handleToggleHabit = async (habitId: string) => {
    await onToggleCheckin(habitId)
  }

  return (
    <div className="streak-bg flex h-screen flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* 統計カード */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-muted-foreground text-sm">今日の進捗</div>
              <div className="font-bold text-2xl">
                {todayCompleted}/{filteredHabits.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-muted-foreground text-sm">総ストリーク</div>
              <div className="font-bold text-2xl">{totalStreak}</div>
            </CardContent>
          </Card>
        </div>

        {/* 期間フィルター */}
        <Tabs defaultValue="all" onValueChange={(v) => setPeriodFilter(v as PeriodFilter)} value={periodFilter}>
          <TabsList className="w-full">
            <TabsTrigger className="flex-1" value="all">
              すべて
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="daily">
              {PERIOD_DISPLAY_NAME.daily}
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="weekly">
              {PERIOD_DISPLAY_NAME.weekly}
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="monthly">
              {PERIOD_DISPLAY_NAME.monthly}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* タスクグリッド */}
        <TaskGrid
          completedHabitIds={completedHabitIds}
          habits={filteredHabits}
          onAddClick={() => setIsAddSheetOpen(true)}
          onToggleHabit={handleToggleHabit}
        />
      </div>

      <StreakToolbar currentTheme={theme} onThemeChange={setTheme} ready={ready} />
      <AddTaskSheet onOpenChange={setIsAddSheetOpen} onSubmit={handleAddHabit} open={isAddSheetOpen} />
    </div>
  )
}
