'use client'

import { useCallback, useState } from 'react'
import { updateDayStartHourAction } from '@/app/actions/settings/updateDayStartHour'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { DAY_START_HOURS, type DayStartHour, isDayStartHour } from '@/constants/habit'
import { cn } from '@/lib/utils'
import { appToast } from '@/lib/utils/toast'

const DAY_START_HOUR_OPTIONS: Array<{ value: DayStartHour; label: string; description: string }> = DAY_START_HOURS.map(
  (hour) => ({
    description:
      hour === 24 ? '暦どおりに切り替えます。' : `この時刻までは前日として記録します（${hour - 24}:00 まで）。`,
    label: `${hour}時（${hour - 24}:00）`,
    value: hour,
  })
)

interface DayStartHourSettingsProps {
  className?: string
  /**
   * サーバー側の user.dayStartHour を初期値・選択状態の正とする。
   * localStorage 由来の表示にすると端末ごとに値が食い違いうるため（weekStart の localStorage
   * フックと同じ問題）、日付境界の設定はサーバー値を唯一の情報源として扱う。
   */
  initialDayStartHour: DayStartHour
}

export function DayStartHourSettings({ className, initialDayStartHour }: DayStartHourSettingsProps) {
  const [dayStartHour, setDayStartHour] = useState<DayStartHour>(initialDayStartHour)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleDayStartHourChange = useCallback(async (value: string) => {
    const parsed = Number(value)
    if (!isDayStartHour(parsed)) {
      return
    }
    setIsUpdating(true)
    try {
      const result = await updateDayStartHourAction(parsed)
      if (result.ok) {
        setDayStartHour(parsed)
        appToast.success('日付が切り替わる時刻を更新しました')
      } else {
        appToast.error('更新に失敗しました', result.error)
      }
    } catch (error) {
      appToast.error('更新に失敗しました', error)
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>日付が切り替わる時刻</CardTitle>
        <CardDescription>チェックインの記録先や「今日」の表示を判定する基準時刻を変更します。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <RadioGroup
          className="grid gap-3"
          disabled={isUpdating}
          onValueChange={handleDayStartHourChange}
          value={String(dayStartHour)}
        >
          {DAY_START_HOUR_OPTIONS.map((option) => {
            const isSelected = dayStartHour === option.value
            const id = `day-start-hour-${option.value}`
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
                htmlFor={id}
                key={option.value}
              >
                <RadioGroupItem className="mt-1" id={id} value={String(option.value)} />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{option.label}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">{option.description}</p>
                </div>
              </Label>
            )
          })}
        </RadioGroup>
        <p className="text-muted-foreground text-xs">変更内容はすぐに保存されます。</p>
      </CardContent>
    </Card>
  )
}
