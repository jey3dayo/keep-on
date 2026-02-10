'use client'

import { Circle, LayoutGrid } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/basics/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DEFAULT_DASHBOARD_VIEW } from '@/constants/dashboard'
import type { Period } from '@/constants/habit'
import { useDashboardStats } from '@/hooks/use-dashboard-stats'
import { usePresetSelection } from '@/hooks/use-preset-selection'
import { cn } from '@/lib/utils'
import { setClientCookie } from '@/lib/utils/cookies'
import { filterHabitsByPeriod } from '@/lib/utils/habits'
import { HabitForm } from './HabitForm'
import { HabitListView } from './HabitListView'
import { HabitPresetSelector } from './HabitPresetSelector'
import { HabitSimpleView } from './HabitSimpleView'
import type { DashboardBaseProps } from './types'

interface StreakDashboardProps extends DashboardBaseProps {
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
  pendingCheckins,
  onAddHabit,
  onAddCheckin,
  onRemoveCheckin,
  onArchiveOptimistic,
  onDeleteOptimistic,
  onResetOptimistic,
  todayLabel,
  initialView = DEFAULT_DASHBOARD_VIEW,
}: StreakDashboardProps) {
  const [currentView, setCurrentView] = useState<View>(initialView)
  const [returnView, setReturnView] = useState<MainView>(initialView)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')

  const { selectedPreset, selectPreset, clearPreset } = usePresetSelection()
  const { completedHabitIds, todayCompleted, totalDaily, totalStreak } = useDashboardStats(habits)

  const filteredHabits = useMemo(() => filterHabitsByPeriod(habits, periodFilter), [habits, periodFilter])
  useEffect(() => {
    const root = document.documentElement
    const shouldApply = currentView === 'dashboard' || currentView === 'simple'

    if (shouldApply) {
      root.style.setProperty('--dashboard-bg', 'var(--primary)')
    } else {
      root.style.removeProperty('--dashboard-bg')
    }

    return () => {
      root.style.removeProperty('--dashboard-bg')
    }
  }, [currentView])

  const openPresetSelector = () => {
    const nextReturnView = currentView === 'simple' ? 'simple' : 'dashboard'
    setReturnView(nextReturnView)
    setCurrentView('preset-selector')
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
          clearPreset()
          setCurrentView(returnView)
        }}
        onCreateCustom={() => {
          clearPreset()
          setCurrentView('add')
        }}
        onSelectPreset={(preset) => {
          selectPreset(preset)
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
          await onAddHabit(input.name, input.icon, {
            color: input.color,
            period: input.period,
            frequency: input.frequency,
          })
          clearPreset()
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
          backgroundColor="var(--primary)"
          completedHabitIds={completedHabitIds}
          habits={habits}
          onAddCheckin={onAddCheckin}
          onAddHabit={openPresetSelector}
          onArchiveOptimistic={onArchiveOptimistic}
          onDeleteOptimistic={onDeleteOptimistic}
          onRemoveCheckin={onRemoveCheckin}
          onResetOptimistic={onResetOptimistic}
          onSettings={() => handleViewChange('dashboard')}
          pendingCheckins={pendingCheckins}
        />
      ) : (
        <div className="streak-bg flex min-h-full flex-col" style={{ backgroundColor: 'var(--primary)' }}>
          <HabitListView
            completedHabitIds={completedHabitIds}
            filteredHabits={filteredHabits}
            habits={habits}
            onAddCheckin={onAddCheckin}
            onAddHabit={openPresetSelector}
            onArchiveOptimistic={onArchiveOptimistic}
            onDeleteOptimistic={onDeleteOptimistic}
            onPeriodChange={setPeriodFilter}
            onRemoveCheckin={onRemoveCheckin}
            onResetOptimistic={onResetOptimistic}
            pendingCheckins={pendingCheckins}
            periodFilter={periodFilter}
            todayCompleted={todayCompleted}
            todayLabel={todayLabel}
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
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <LayoutGrid className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium">リストビュー</p>
                      <p className="text-muted-foreground text-xs">詳細重視の一覧</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Circle className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium">シンプルビュー</p>
                      <p className="text-muted-foreground text-xs">コンパクト表示・スマホ向け</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-1 rounded-full border border-border bg-card/90 p-1 shadow-lg backdrop-blur-md">
            <Button
              className={cn(
                'rounded-full p-2 transition-all',
                currentView === 'dashboard' ? 'bg-foreground text-background' : 'text-muted-foreground'
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
                'rounded-full p-2 transition-all',
                currentView === 'simple' ? 'bg-foreground text-background' : 'text-muted-foreground'
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
