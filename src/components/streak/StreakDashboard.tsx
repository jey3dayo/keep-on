'use client'

import { Circle, LayoutGrid } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/basics/Button'
import type { IconName } from '@/components/basics/Icon'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DEFAULT_HABIT_COLOR, type Period } from '@/constants/habit'
import { getColorById, type HabitPreset } from '@/constants/habit-data'
import { cn } from '@/lib/utils'
import { setClientCookie } from '@/lib/utils/cookies'
import { filterHabitsByPeriod } from '@/lib/utils/habits'
import type { HabitWithProgress } from '@/types/habit'
import { HabitForm } from './HabitForm'
import { HabitListView } from './HabitListView'
import { HabitPresetSelector } from './HabitPresetSelector'
import { HabitSimpleView } from './HabitSimpleView'

interface StreakDashboardProps {
  habits: HabitWithProgress[]
  onAddHabit: (
    name: string,
    icon: IconName,
    options?: { color?: string | null; period?: Period; frequency?: number }
  ) => Promise<void>
  onToggleCheckin: (habitId: string) => Promise<void>
  initialView?: MainView
}

type PeriodFilter = 'all' | Period
type View = 'dashboard' | 'simple' | 'preset-selector' | 'add'
type MainView = 'dashboard' | 'simple'

const VIEW_COOKIE_KEY = 'ko_dashboard_view'
const VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

const persistMainView = (view: MainView) => {
  setClientCookie(VIEW_COOKIE_KEY, view, {
    maxAge: VIEW_COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
  })
}

export function StreakDashboard({
  habits,
  onAddHabit,
  onToggleCheckin,
  initialView = 'dashboard',
}: StreakDashboardProps) {
  const [currentView, setCurrentView] = useState<View>(initialView)
  const [returnView, setReturnView] = useState<MainView>(initialView)
  const [selectedPreset, setSelectedPreset] = useState<HabitPreset | null>(null)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')

  const completedHabitIds = new Set(habits.filter((habit) => habit.currentProgress >= habit.frequency).map((h) => h.id))

  // 期間フィルター適用
  const filteredHabits = filterHabitsByPeriod(habits, periodFilter)

  // 統計計算
  const dailyHabits = habits.filter((h) => h.period === 'daily')
  const todayCompleted = dailyHabits.filter((h) => h.currentProgress >= h.frequency).length
  const totalDaily = dailyHabits.length
  const totalStreak = habits.reduce((sum, h) => sum + h.streak, 0)
  const mainBackgroundColor = getColorById(habits[0]?.color ?? DEFAULT_HABIT_COLOR).color

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

  const handleViewChange = (view: View) => {
    setCurrentView(view)
    if (view === 'dashboard' || view === 'simple') {
      setReturnView(view)
      persistMainView(view)
    }
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
          backgroundColor={mainBackgroundColor}
          completedHabitIds={completedHabitIds}
          habits={habits}
          onAddHabit={openPresetSelector}
          onSettings={() => handleViewChange('dashboard')}
          onToggleHabit={handleToggleHabit}
        />
      ) : (
        <div className="streak-bg flex h-screen flex-col" style={{ backgroundColor: mainBackgroundColor }}>
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

      <ViewToggle currentView={currentView} onViewChange={handleViewChange} />
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
        <div className="group relative">
          <div className="absolute right-0 bottom-full mb-2 hidden w-64 group-hover:block">
            <Card className="border-border bg-popover shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">ビュー切り替え</CardTitle>
                <CardDescription className="text-xs">表示スタイルを選択できます</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <LayoutGrid className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium">リストビュー</p>
                      <p className="text-muted-foreground text-xs">詳細なリスト表示</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Circle className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium">シンプルビュー</p>
                      <p className="text-muted-foreground text-xs">円形アイコン表示</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-1 rounded-full border border-border bg-card/90 p-1 shadow-lg backdrop-blur-md">
            <Button
              className={cn(
                'rounded-full p-2 transition-all hover:bg-transparent',
                currentView === 'dashboard'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => onViewChange('dashboard')}
              size="icon"
              title="リストビュー"
              type="button"
              variant="ghost"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              className={cn(
                'rounded-full p-2 transition-all hover:bg-transparent',
                currentView === 'simple'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => onViewChange('simple')}
              size="icon"
              title="シンプルビュー"
              type="button"
              variant="ghost"
            >
              <Circle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
