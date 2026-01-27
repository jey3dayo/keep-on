'use client'

import { Icon } from '@/components/Icon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DashboardStatsCard } from './DashboardStatsCard'

interface DashboardHeaderProps {
  todayCompleted: number
  totalDaily: number
  totalStreak: number
  onAddClick?: () => void
  variant: 'mobile' | 'desktop'
}

export function DashboardHeader({
  todayCompleted,
  totalDaily,
  totalStreak,
  onAddClick,
  variant,
}: DashboardHeaderProps) {
  const today = new Date()
  const dayNames = ['日', '月', '火', '水', '木', '金', '土']
  const currentDayName = dayNames[today.getDay()]

  return (
    <>
      {/* ヘッダー: 日付とタイトル */}
      <div className={cn('flex items-center justify-between', variant === 'mobile' && 'mb-4')}>
        <div>
          <p className="text-muted-foreground text-sm">
            {today.getMonth() + 1}月{today.getDate()}日（{currentDayName}）
          </p>
          <h1 className="font-bold text-2xl">今日の習慣</h1>
        </div>
        {variant === 'desktop' && onAddClick && (
          <Button onClick={onAddClick} size="icon">
            <Icon className="h-5 w-5" name="plus" />
          </Button>
        )}
      </div>

      {/* 統計カード */}
      <div className={cn('gap-3', variant === 'mobile' ? 'grid grid-cols-2' : 'flex')}>
        <DashboardStatsCard total={totalDaily} type="progress" value={todayCompleted} />
        <DashboardStatsCard suffix="日" type="streak" value={totalStreak} />
      </div>
    </>
  )
}
