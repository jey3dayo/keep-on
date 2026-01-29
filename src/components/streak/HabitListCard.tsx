'use client'

import type { CSSProperties } from 'react'
import { useRef } from 'react'
import { Button, CheckInButton } from '@/components/basics/Button'
import { Icon, normalizeIconName } from '@/components/basics/Icon'
import { DEFAULT_HABIT_COLOR } from '@/constants/habit'
import { getColorById, getIconById, getPeriodById } from '@/constants/habit-data'
import { cn } from '@/lib/utils'
import type { HabitWithProgress } from '@/types/habit'

interface HabitListCardProps {
  habit: HabitWithProgress
  completed: boolean
  pending?: boolean
  dimmed?: boolean
  dimmedOpacity?: number
  onToggle: () => void
  onLongPressOrContextMenu: () => void
}

export function HabitListCard({
  habit,
  completed,
  pending = false,
  dimmed = false,
  dimmedOpacity = 0.72,
  onToggle,
  onLongPressOrContextMenu,
}: HabitListCardProps) {
  const colorData = getColorById(habit.color ?? DEFAULT_HABIT_COLOR)
  const periodData = getPeriodById(habit.period)
  const IconComponent = getIconById(normalizeIconName(habit.icon)).icon
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const badgeBackgroundColor = `var(--${colorData.id}-a4)`

  const progressPercent = Math.min((habit.currentProgress / habit.frequency) * 100, 100)

  const handleLongPressStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      onLongPressOrContextMenu()
    }, 500)
  }

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    onLongPressOrContextMenu()
  }

  return (
    <div
      className={cn(
        'group relative rounded-2xl border border-border/60 bg-card/95 p-4 pr-12 shadow-sm transition-all duration-200 hover:border-border/80 hover:shadow-md motion-reduce:transition-none'
      )}
      onContextMenu={handleContextMenu}
      onPointerDown={handleLongPressStart}
      onPointerLeave={handleLongPressEnd}
      onPointerUp={handleLongPressEnd}
      style={{
        opacity: dimmed ? dimmedOpacity : 1,
      }}
    >
      <Button
        aria-haspopup="dialog"
        aria-label={`${habit.name}の操作を開く`}
        className="absolute top-3 right-3 h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
        onClick={(event) => {
          event.stopPropagation()
          onLongPressOrContextMenu()
        }}
        onPointerDown={(event) => {
          event.stopPropagation()
        }}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Icon className="h-4 w-4" name="more-horizontal" />
      </Button>
      <div className="flex items-center gap-4">
        <CheckInButton
          aria-label={`${habit.name}をチェックイン`}
          aria-pressed={completed}
          completed={completed}
          disabled={pending}
          onClick={onToggle}
          style={
            {
              backgroundColor: colorData.color,
              opacity: completed ? 1 : 0.85,
              '--tw-ring-color': colorData.color,
            } as CSSProperties
          }
        >
          {completed ? (
            <Icon className="h-7 w-7 text-background" name="check" />
          ) : (
            <IconComponent className="h-7 w-7 text-background" />
          )}
        </CheckInButton>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate font-semibold text-foreground text-lg transition-colors">{habit.name}</h3>
            <span
              className="flex-shrink-0 rounded-full border border-transparent px-2 py-0.5 text-xs"
              style={{
                backgroundColor: badgeBackgroundColor,
                color: colorData.color,
              }}
            >
              {periodData.label}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary/70">
              <div
                className="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: colorData.color,
                }}
              />
            </div>
            <span className="whitespace-nowrap font-medium text-muted-foreground text-sm">
              {habit.currentProgress} / {habit.frequency}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1">
            <Icon className="h-4 w-4" name="flame" style={{ color: habit.streak > 0 ? colorData.color : undefined }} />
            <span className="font-bold text-lg" style={{ color: habit.streak > 0 ? colorData.color : undefined }}>
              {habit.streak}
            </span>
          </div>
          <span className="text-muted-foreground text-xs">日連続</span>
        </div>
      </div>

      {!completed && habit.frequency > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 border-border border-t pt-3 text-muted-foreground text-xs">
          次のチェックインで完了
        </div>
      )}
    </div>
  )
}
