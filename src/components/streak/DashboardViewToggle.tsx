'use client'

import { Circle, LayoutGrid, type LucideIcon } from 'lucide-react'
import { useCallback } from 'react'
import { Button } from '@/components/basics/Button'
import type { DashboardView } from '@/constants/dashboard'
import { cn } from '@/lib/utils'

interface DashboardViewToggleProps {
  activeButtonClassName?: string
  buttonClassName?: string
  currentView: DashboardView
  inactiveButtonClassName?: string
  onViewChange: (view: DashboardView) => void
}

const VIEW_OPTIONS: Array<{
  icon: LucideIcon
  label: string
  value: DashboardView
}> = [
  {
    icon: LayoutGrid,
    label: 'リストビュー',
    value: 'dashboard',
  },
  {
    icon: Circle,
    label: 'シンプルビュー',
    value: 'simple',
  },
]

export function DashboardViewToggle({
  activeButtonClassName = 'bg-foreground text-background',
  buttonClassName = 'rounded-full p-2',
  currentView,
  inactiveButtonClassName,
  onViewChange,
}: DashboardViewToggleProps) {
  const handleViewChange = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const view = event.currentTarget.dataset.view
      if (view === 'dashboard' || view === 'simple') {
        onViewChange(view)
      }
    },
    [onViewChange]
  )
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-card/90 p-1 shadow-lg backdrop-blur-md">
      {VIEW_OPTIONS.map((option) => {
        const Icon = option.icon
        return (
          <Button
            aria-label={`${option.label}に切り替え`}
            aria-pressed={currentView === option.value}
            className={cn(
              buttonClassName,
              currentView === option.value ? activeButtonClassName : inactiveButtonClassName,
              'min-h-11 min-w-11 transition-colors duration-200'
            )}
            data-view={option.value}
            key={option.value}
            onClick={handleViewChange}
            size="icon"
            title={option.label}
            type="button"
            variant="ghost"
          >
            <Icon className="h-4 w-4" />
          </Button>
        )
      })}
    </div>
  )
}
