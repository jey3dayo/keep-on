'use client'

import { addDays, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface HabitCalendarHeatmapProps {
  accentColor: string
  checkinCounts: Map<string, number>
  frequency: number
  months?: number
  skipDates?: string[]
}

interface DayCell {
  count: number
  date: Date
  dateKey: string
  isCurrentMonth: boolean
  isFuture: boolean
  isSkip: boolean
}

const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']
const EMPTY_SKIP_DATES: string[] = []

function getCheckinColor(count: number, frequency: number, accentColor: string): string {
  const ratio = Math.min(count / frequency, 1)
  // 30% → 100% の範囲でグラデーション
  const pct = Math.round(30 + ratio * 70)
  return `color-mix(in srgb, ${accentColor} ${pct}%, transparent)`
}

function getLegendSteps(frequency: number): number[] {
  const safeFrequency = Math.max(frequency, 1)
  return Array.from(new Set([1, Math.ceil(safeFrequency / 2), safeFrequency])).sort((a, b) => a - b)
}

function getCellStyle(cell: DayCell, accentColor: string, frequency: number) {
  if (cell.count > 0) {
    return { backgroundColor: getCheckinColor(cell.count, frequency, accentColor) }
  }
  if (cell.isSkip) {
    return {
      border: `2px dashed ${accentColor}`,
      backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
    }
  }
  return
}

function getCellTitle(cell: DayCell, frequency: number): string {
  if (cell.count > 0) {
    return `${cell.dateKey} ${cell.count}/${frequency}回`
  }
  if (cell.isSkip) {
    return `${cell.dateKey} スキップ`
  }
  return cell.dateKey
}

interface CalendarCellProps {
  accentColor: string
  cell: DayCell
  frequency: number
}

function CalendarCell({ cell, accentColor, frequency }: CalendarCellProps) {
  return (
    <div
      className={cn(
        'aspect-square rounded-sm',
        !cell.isCurrentMonth && 'opacity-30',
        cell.isFuture && 'opacity-10',
        cell.count === 0 && !cell.isSkip && 'bg-muted'
      )}
      key={cell.dateKey}
      style={getCellStyle(cell, accentColor, frequency)}
      title={getCellTitle(cell, frequency)}
    />
  )
}

function buildMonthGrid(
  month: Date,
  checkinCounts: Map<string, number>,
  skipSet: Set<string>,
  today: Date
): DayCell[][] {
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  const days = eachDayOfInterval({ start, end })

  // 月曜始まり: 0=Mon, 1=Tue, ..., 6=Sun
  const startWeekday = (getDay(start) + 6) % 7 // 0=Mon
  const prefixCount = startWeekday

  const cells: DayCell[] = []

  // prefix empty cells
  for (let i = 0; i < prefixCount; i++) {
    const d = addDays(start, -(prefixCount - i))
    const dateKey = format(d, 'yyyy-MM-dd')
    cells.push({
      date: d,
      dateKey,
      count: checkinCounts.get(dateKey) ?? 0,
      isSkip: skipSet.has(dateKey),
      isCurrentMonth: false,
      isFuture: d > today,
    })
  }

  for (const day of days) {
    const dateKey = format(day, 'yyyy-MM-dd')
    cells.push({
      date: day,
      dateKey,
      count: checkinCounts.get(dateKey) ?? 0,
      isSkip: skipSet.has(dateKey),
      isCurrentMonth: true,
      isFuture: day > today,
    })
  }

  // pad to multiple of 7
  while (cells.length % 7 !== 0) {
    const d = addDays(end, cells.length - prefixCount - days.length + 1)
    const dateKey = format(d, 'yyyy-MM-dd')
    cells.push({
      date: d,
      dateKey,
      count: checkinCounts.get(dateKey) ?? 0,
      isSkip: skipSet.has(dateKey),
      isCurrentMonth: false,
      isFuture: d > today,
    })
  }

  // split into weeks
  const weeks: DayCell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}

export function HabitCalendarHeatmap({
  checkinCounts,
  skipDates = EMPTY_SKIP_DATES,
  accentColor,
  frequency,
  months = 6,
}: HabitCalendarHeatmapProps) {
  const today = useMemo(() => new Date(), [])

  const legendSteps = useMemo(() => getLegendSteps(frequency), [frequency])
  const skipSet = useMemo(() => new Set(skipDates), [skipDates])

  const monthList = useMemo(() => {
    const result: Date[] = []
    for (let i = 0; i < months; i++) {
      result.push(subMonths(today, i))
    }
    return result
  }, [today, months])

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-xs">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {legendSteps.map((step) => (
              <div
                className="h-3 w-3 rounded-sm"
                key={step}
                style={{ backgroundColor: getCheckinColor(step, frequency, accentColor) }}
                title={`${step}/${frequency}回`}
              />
            ))}
          </div>
          <span>チェックイン（達成率に応じて濃く表示）</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm border-2 border-dashed" style={{ borderColor: accentColor }} />
          <span>スキップ</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-muted" />
          <span>未達成</span>
        </div>
      </div>

      {monthList.map((month) => {
        const weeks = buildMonthGrid(month, checkinCounts, skipSet, today)
        const monthLabel = format(month, 'yyyy年M月', { locale: ja })

        return (
          <div className="space-y-2" key={monthLabel}>
            <div className="font-medium text-foreground text-sm">{monthLabel}</div>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAY_LABELS.map((label) => (
                <div className="text-center text-muted-foreground text-xs" key={label}>
                  {label}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="space-y-1">
              {weeks.map((week, wi) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: stable week index
                <div className="grid grid-cols-7 gap-1" key={wi}>
                  {week.map((cell) => (
                    <CalendarCell accentColor={accentColor} cell={cell} frequency={frequency} key={cell.dateKey} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
