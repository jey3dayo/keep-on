'use client'

import { Circle, LayoutGrid } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/basics/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardView } from '@/constants/dashboard'
import type { Period } from '@/constants/habit'
import { useDashboardStats } from '@/hooks/use-dashboard-stats'
import { cn } from '@/lib/utils'
import { filterHabitsByPeriod } from '@/lib/utils/habits'
import { HabitListView } from './HabitListView'
import { HabitSimpleView } from './HabitSimpleView'
import type { DashboardBaseProps } from './types'

interface StreakDashboardProps extends DashboardBaseProps {
  currentView: DashboardView
  onViewChange: (view: DashboardView) => void
}

type PeriodFilter = 'all' | Period

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
  currentView,
  onViewChange,
}: StreakDashboardProps) {
  const router = useRouter()
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')

  const { completedHabitIds, todayActive, totalDaily, totalStreak } = useDashboardStats(habits)

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

  return (
    <>
      {currentView === 'simple' ? (
        <HabitSimpleView
          backgroundColor="var(--primary)"
          completedHabitIds={completedHabitIds}
          habits={habits}
          onAddCheckin={onAddCheckin}
          onAddHabit={() => router.push('/habits/new?step=preset')}
          onArchiveOptimistic={onArchiveOptimistic}
          onDeleteOptimistic={onDeleteOptimistic}
          onRemoveCheckin={onRemoveCheckin}
          onResetOptimistic={onResetOptimistic}
          onSettings={() => onViewChange('dashboard')}
        />
      ) : (
        <div className="streak-bg flex min-h-full flex-col" style={{ backgroundColor: 'var(--primary)' }}>
          <HabitListView
            completedHabitIds={completedHabitIds}
            filteredHabits={filteredHabits}
            habits={habits}
            onAddCheckin={onAddCheckin}
            onAddHabit={() => router.push('/habits/new?step=preset')}
            onArchiveOptimistic={onArchiveOptimistic}
            onDeleteOptimistic={onDeleteOptimistic}
            onPeriodChange={setPeriodFilter}
            onRemoveCheckin={onRemoveCheckin}
            onResetOptimistic={onResetOptimistic}
            onSkip={onSkip}
            onUnSkip={onUnSkip}
            periodFilter={periodFilter}
            todayActive={todayActive}
            todayLabel={todayLabel}
            totalDaily={totalDaily}
            totalStreak={totalStreak}
          />
        </div>
      )}

      <ViewToggle currentView={currentView} onViewChange={onViewChange} />
    </>
  )
}

interface ViewToggleProps {
  currentView: DashboardView
  onViewChange: (view: DashboardView) => void
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
