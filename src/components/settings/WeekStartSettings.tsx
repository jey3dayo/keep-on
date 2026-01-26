'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useWeekStart } from '@/hooks/use-week-start'

export function WeekStartSettings() {
  const { weekStart, setWeekStart, ready } = useWeekStart()

  const handleWeekStartChange = (value: string) => {
    if (value === 'monday' || value === 'sunday') {
      setWeekStart(value)
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
          <RadioGroup onValueChange={handleWeekStartChange} value={weekStart}>
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
