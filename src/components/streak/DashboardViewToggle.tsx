'use client'

import { Circle, LayoutGrid, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/basics/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  description: string
  icon: LucideIcon
  label: string
  value: DashboardView
}> = [
  {
    description: '詳細重視の一覧',
    icon: LayoutGrid,
    label: 'リストビュー',
    value: 'dashboard',
  },
  {
    description: 'コンパクト表示・スマホ向け',
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
  return (
    <div className="group relative">
      <div className="absolute right-0 bottom-full mb-2 hidden w-64 group-hover:block">
        <Card className="border-border bg-popover shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">ビュー切り替え</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 text-sm">
              {VIEW_OPTIONS.map((option) => {
                const Icon = option.icon
                return (
                  <div className="flex items-start gap-2" key={option.value}>
                    <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-muted-foreground text-xs">{option.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-1 rounded-full border border-border bg-card/90 p-1 shadow-lg backdrop-blur-md">
        {VIEW_OPTIONS.map((option) => {
          const Icon = option.icon
          return (
            <Button
              className={cn(
                buttonClassName,
                currentView === option.value ? activeButtonClassName : inactiveButtonClassName
              )}
              key={option.value}
              onClick={() => onViewChange(option.value)}
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
    </div>
  )
}
