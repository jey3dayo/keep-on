'use client'

import { Circle, LayoutGrid } from 'lucide-react'
import { useState } from 'react'
import type { IconName } from '@/components/Icon'
import type { Period } from '@/constants/habit'
import type { HabitPreset } from '@/constants/habit-data'
import { cn } from '@/lib/utils'
import { filterHabitsByPeriod } from '@/lib/utils/habits'
import type { HabitWithProgress } from '@/types/habit'
import { HabitForm } from './HabitForm'
import { HabitListView } from './HabitListView'
import { HabitPresetSelector } from './HabitPresetSelector'
import { HabitSimpleView } from './HabitSimpleView'

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
  onAddHabit: (
    name: string,
    icon: IconName,
    options?: { color?: string | null; period?: Period; frequency?: number }
  ) => Promise<void>
  onToggleCheckin: (habitId: string) => Promise<void>
}

type PeriodFilter = 'all' | Period
type View = 'dashboard' | 'simple' | 'preset-selector' | 'add'
type MainView = 'dashboard' | 'simple'

export function StreakDashboard({ habits, todayCheckins, onAddHabit, onToggleCheckin }: StreakDashboardProps) {
  const [currentView, setCurrentView] = useState<View>('dashboard')
  const [returnView, setReturnView] = useState<MainView>('dashboard')
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

  const openPresetSelector = () => {
    const nextReturnView = currentView === 'simple' ? 'simple' : 'dashboard'
    setReturnView(nextReturnView)
    setCurrentView('preset-selector')
  }

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

  if (currentView === 'preset-selector') {
    return (
      <HabitPresetSelector
        onClose={() => {
          setSelectedPreset(null)
          setCurrentView(returnView)
        }}
        onCreateCustom={() => {
          setSelectedPreset(null)
          setCurrentView('add')
        }}
        onSelectPreset={(preset) => {
          setSelectedPreset(preset)
          setCurrentView('add')
        }}
      />
    )
  }

  if (currentView === 'add') {
    return (
      <HabitForm
        onBack={() => setCurrentView('preset-selector')}
        onSubmit={async (input) => {
          await handleAddHabit(input.name, input.icon, {
            color: input.color,
            period: input.period,
            frequency: input.frequency,
          })
          setSelectedPreset(null)
          setCurrentView(returnView)
        }}
        preset={selectedPreset}
      />
    )
  }

  return (
    <>
      {currentView === 'simple' ? (
        <HabitSimpleView
          completedHabitIds={completedHabitIds}
          habits={habits}
          onAddHabit={openPresetSelector}
          onSettings={() => setCurrentView('dashboard')}
          onToggleHabit={handleToggleHabit}
        />
      ) : (
        <div className="streak-bg flex h-screen flex-col">
          <HabitListView
            completedHabitIds={completedHabitIds}
            filteredHabits={filteredHabits}
            habits={habits}
            onAddHabit={openPresetSelector}
            onPeriodChange={setPeriodFilter}
            onToggleHabit={handleToggleHabit}
            periodFilter={periodFilter}
            todayCompleted={todayCompleted}
            totalDaily={totalDaily}
            totalStreak={totalStreak}
          />
        </div>
      )}

      <ViewToggle currentView={currentView} onViewChange={setCurrentView} />
    </>
  )
}

interface ViewToggleProps {
  currentView: View
  onViewChange: (view: View) => void
}

function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  if (currentView !== 'dashboard' && currentView !== 'simple') {
    return null
  }

  return (
    <div className="fixed right-4 bottom-6 z-50">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-full border border-border bg-card/90 p-1 shadow-lg backdrop-blur-md">
          <button
            className={cn(
              'rounded-full px-3 py-3 transition-all',
              currentView === 'dashboard'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => onViewChange('dashboard')}
            title="リストビュー"
            type="button"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            className={cn(
              'rounded-full px-3 py-3 transition-all',
              currentView === 'simple' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => onViewChange('simple')}
            title="シンプルビュー"
            type="button"
          >
            <Circle className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
