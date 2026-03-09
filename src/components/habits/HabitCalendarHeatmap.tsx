'use client'

import { addDays, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface HabitCalendarHeatmapProps {
  accentColor: string
  checkinDates: string[]
  months?: number
  skipDates?: string[]
}

interface DayCell {
  date: Date
  dateKey: string
  isCheckin: boolean
  isCurrentMonth: boolean
  isFuture: boolean
  isSkip: boolean
}

const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']

function getCellStyle(cell: DayCell, accentColor: string) {
  if (cell.isCheckin) {
    return { backgroundColor: accentColor }
  }
  if (cell.isSkip) {
    return { border: `2px dashed ${accentColor}`, backgroundColor: `${accentColor}20` }
  }
  return undefined
}

function getCellTitle(cell: DayCell): string {
  if (cell.isCheckin) {
    return `${cell.dateKey} ✓`
  }
  if (cell.isSkip) {
    return `${cell.dateKey} スキップ`
  }
  return cell.dateKey
}

interface CalendarCellProps {
  accentColor: string
  cell: DayCell
}

function CalendarCell({ cell, accentColor }: CalendarCellProps) {
  return (
    <div
      className={cn(
        'aspect-square rounded-sm',
        !cell.isCurrentMonth && 'opacity-30',
        cell.isFuture && 'opacity-10',
        !(cell.isCheckin || cell.isSkip) && 'bg-muted'
      )}
      key={cell.dateKey}
      style={getCellStyle(cell, accentColor)}
      title={getCellTitle(cell)}
    />
  )
}

function buildMonthGrid(month: Date, checkinSet: Set<string>, skipSet: Set<string>, today: Date): DayCell[][] {
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
      isCheckin: checkinSet.has(dateKey),
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
      isCheckin: checkinSet.has(dateKey),
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
      isCheckin: checkinSet.has(dateKey),
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
  checkinDates,
  skipDates = [],
  accentColor,
  months = 6,
}: HabitCalendarHeatmapProps) {
  const today = useMemo(() => new Date(), [])

  const checkinSet = useMemo(() => new Set(checkinDates), [checkinDates])
  const skipSet = useMemo(() => new Set(skipDates), [skipDates])

  const monthList = useMemo(() => {
    const result: Date[] = []
    for (let i = months - 1; i >= 0; i--) {
      result.push(subMonths(today, i))
    }
    return result
  }, [today, months])

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex items-center gap-4 text-muted-foreground text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: accentColor }} />
          <span>チェックイン</span>
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
        const weeks = buildMonthGrid(month, checkinSet, skipSet, today)
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
                    <CalendarCell accentColor={accentColor} cell={cell} key={cell.dateKey} />
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
