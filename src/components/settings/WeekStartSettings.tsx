'use client'

import { useState } from 'react'
import { updateWeekStartAction } from '@/app/actions/settings/updateWeekStart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { WeekStart } from '@/constants/habit'
import { useWeekStart } from '@/hooks/use-week-start'
import { appToast } from '@/lib/utils/toast'

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
        <CardDescription>カレンダー表示の週の開始日を変更します。</CardDescription>
      </CardHeader>
      <CardContent>
        {ready ? (
          <RadioGroup disabled={isUpdating} onValueChange={handleWeekStartChange} value={weekStart}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem id="monday" value="monday" />
              <Label htmlFor="monday">月曜日</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem id="sunday" value="sunday" />
              <Label htmlFor="sunday">日曜日</Label>
            </div>
          </RadioGroup>
        ) : (
          <div className="h-20 w-full rounded bg-muted" />
        )}
      </CardContent>
    </Card>
  )
}
