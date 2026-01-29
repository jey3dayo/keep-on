'use client'

import { useState } from 'react'
import { updateWeekStartAction } from '@/app/actions/settings/updateWeekStart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import type { WeekStart } from '@/constants/habit'
import { useWeekStart } from '@/hooks/use-week-start'
import { cn } from '@/lib/utils'
import { appToast } from '@/lib/utils/toast'

const WEEK_START_OPTIONS: Array<{ value: WeekStart; label: string; description: string }> = [
  { value: 'monday', label: '月曜日', description: '週次集計を月曜起点で計算します。' },
  { value: 'sunday', label: '日曜日', description: 'カレンダー表示に合わせた週の区切りです。' },
]

export function WeekStartSettings() {
  const { weekStart, setWeekStart, ready } = useWeekStart()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleWeekStartChange = async (value: string) => {
    if (value === 'monday' || value === 'sunday') {
      const weekStartValue = value as WeekStart
      setIsUpdating(true)
      try {
        const result = await updateWeekStartAction(weekStartValue)
        if (result.ok) {
          setWeekStart(weekStartValue)
          appToast.success('週の開始日を更新しました')
        } else {
          appToast.error('更新に失敗しました', result.error)
        }
      } catch (error) {
        appToast.error('更新に失敗しました', error)
      } finally {
        setIsUpdating(false)
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>週の開始日</CardTitle>
        <CardDescription>カレンダー表示と週次集計の基準を変更します。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {ready ? (
          <RadioGroup
            className="grid gap-3"
            disabled={isUpdating}
            onValueChange={handleWeekStartChange}
            value={weekStart}
          >
            {WEEK_START_OPTIONS.map((option) => {
              const isSelected = weekStart === option.value
              return (
                <Label
                  aria-disabled={isUpdating}
                  className={cn(
                    'flex w-full cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-background p-3 font-normal text-sm leading-normal transition-colors',
                    'hover:border-foreground/40 hover:bg-muted/30',
                    'focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
                    isSelected && 'border-primary/60 bg-primary/5',
                    isUpdating && 'cursor-not-allowed opacity-70'
                  )}
                  htmlFor={option.value}
                  key={option.value}
                >
                  <RadioGroupItem className="mt-1" id={option.value} value={option.value} />
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{option.label}</p>
                    <p className="text-muted-foreground text-sm leading-relaxed">{option.description}</p>
                  </div>
                </Label>
              )
            })}
          </RadioGroup>
        ) : (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg motion-reduce:animate-none" />
            <Skeleton className="h-16 w-full rounded-lg motion-reduce:animate-none" />
          </div>
        )}
        <p className="text-muted-foreground text-xs">変更内容はすぐに保存されます。</p>
      </CardContent>
    </Card>
  )
}
