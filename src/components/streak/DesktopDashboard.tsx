'use client'

import { Circle, LayoutGrid } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Button } from '@/components/basics/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Period } from '@/constants/habit'
import { useDashboardStats } from '@/hooks/use-dashboard-stats'
import { setClientCookie } from '@/lib/utils/cookies'
import { filterHabitsByPeriod } from '@/lib/utils/habits'
import type { User } from '@/types/user'
import { HabitListView } from './HabitListView'
import { HabitSimpleView } from './HabitSimpleView'
import type { DashboardBaseProps } from './types'

interface DesktopDashboardProps extends DashboardBaseProps {
  initialView?: MainView
  user: User
}

type PeriodFilter = 'all' | Period
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

export function DesktopDashboard({
  habits,
  onAddCheckin,
  onRemoveCheckin,
  onArchiveOptimistic,
  onDeleteOptimistic,
  onResetOptimistic,
  todayLabel,
  initialView = 'dashboard',
}: DesktopDashboardProps) {
  const router = useRouter()
  const [currentView, setCurrentView] = useState<MainView>(initialView)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')

  const { completedHabitIds, todayActive, totalDaily, totalStreak } = useDashboardStats(habits)

  const filteredHabits = useMemo(() => filterHabitsByPeriod(habits, periodFilter), [habits, periodFilter])

  const handleViewChange = (view: MainView) => {
    setCurrentView(view)
    persistMainView(view)
  }

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
          onSettings={() => handleViewChange('dashboard')}
        />
      ) : (
        <div className="space-y-6 p-6">
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
            periodFilter={periodFilter}
            todayActive={todayActive}
            todayLabel={todayLabel}
            totalDaily={totalDaily}
            totalStreak={totalStreak}
          />
        </div>
      )}

      <DesktopViewToggle currentView={currentView} onViewChange={handleViewChange} />
    </>
  )
}

interface DesktopViewToggleProps {
  currentView: MainView
  onViewChange: (view: MainView) => void
}

function DesktopViewToggle({ currentView, onViewChange }: DesktopViewToggleProps) {
  return (
    <div className="fixed right-4 bottom-6 z-50 hidden md:block">
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
            className={
              currentView === 'dashboard' ? 'rounded-full bg-foreground p-2 text-background' : 'rounded-full p-2'
            }
            onClick={() => onViewChange('dashboard')}
            size="icon"
            title="リストビュー"
            type="button"
            variant="ghost"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            className={currentView === 'simple' ? 'rounded-full bg-foreground p-2 text-background' : 'rounded-full p-2'}
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
  )
}
