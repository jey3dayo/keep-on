'use client'

import { Icon } from '@/components/basics/Icon'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface DashboardStatsCardProps {
  type: 'progress' | 'streak'
  value: number | string
  total?: number
  suffix?: string
  className?: string
}

export function DashboardStatsCard({ type, value, total, suffix, className }: DashboardStatsCardProps) {
  const isProgress = type === 'progress'
  const icon = isProgress ? 'check' : 'flame'
  const label = isProgress ? '今日の進捗' : '総ストリーク'
  const iconBgColor = isProgress ? 'bg-accent/20' : 'bg-orange-500/20'
  const iconColor = isProgress ? 'text-accent' : 'text-orange-500'

  return (
    <Card className={cn('p-3', className)}>
      <div className="mb-1 flex items-center gap-2">
        <div className={cn('flex h-6 w-6 items-center justify-center rounded-full', iconBgColor)}>
          <Icon className={cn('h-3.5 w-3.5', iconColor)} name={icon} />
        </div>
        <span className="text-muted-foreground text-xs">{label}</span>
      </div>
      <p className="font-bold text-xl">
        {value}
        {total !== undefined && <span className="font-normal text-muted-foreground text-sm"> / {total}</span>}
        {suffix && <span className="font-normal text-muted-foreground text-sm"> {suffix}</span>}
      </p>
    </Card>
  )
}
