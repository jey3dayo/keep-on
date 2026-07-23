'use client'

import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { useRef } from 'react'
import { Button, CheckInButton } from '@/components/basics/Button'
import { Icon, normalizeIconName } from '@/components/basics/Icon'
import { DEFAULT_HABIT_COLOR } from '@/constants/habit'
import { getColorById, getIconById, getPeriodById } from '@/constants/habit-data'
import { cn } from '@/lib/utils'
import type { HabitWithProgress } from '@/types/habit'

// スクロール操作を長押しと誤検知しないための移動許容量
const LONG_PRESS_MOVE_THRESHOLD_PX = 10

interface HabitListCardProps {
  completed: boolean
  dimmed?: boolean
  dimmedOpacity?: number
  habit: HabitWithProgress
  onAdd?: () => void
  onLongPressOrContextMenu: () => void
  onRemove?: () => void
}

export function HabitListCard({
  habit,
  completed,
  dimmed = false,
  dimmedOpacity = 0.72,
  onAdd,
  onRemove,
  onLongPressOrContextMenu,
}: HabitListCardProps) {
  const colorData = getColorById(habit.color ?? DEFAULT_HABIT_COLOR)
  const periodData = getPeriodById(habit.period)
  const IconComponent = getIconById(normalizeIconName(habit.icon)).icon
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const longPressTriggeredRef = useRef(false)
  const longPressStartPointRef = useRef<{ x: number; y: number } | null>(null)
  const badgeBackgroundColor = `var(--${colorData.id}-a4)`

  const progressPercent = Math.min((habit.currentProgress / habit.frequency) * 100, 100)

  const handleLongPressStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    longPressTriggeredRef.current = false
    longPressStartPointRef.current = { x: event.clientX, y: event.clientY }
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true
      onLongPressOrContextMenu()
    }, 500)
  }

  const handleLongPressMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const startPoint = longPressStartPointRef.current
    if (!(startPoint && longPressTimerRef.current)) {
      return
    }
    const deltaX = event.clientX - startPoint.x
    const deltaY = event.clientY - startPoint.y
    if (Math.hypot(deltaX, deltaY) > LONG_PRESS_MOVE_THRESHOLD_PX) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressStartPointRef.current = null
  }

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    longPressTriggeredRef.current = true
    onLongPressOrContextMenu()
  }

  const handleCardClick = () => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false
      return
    }
    onLongPressOrContextMenu()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onLongPressOrContextMenu()
    }
  }

  return (
    <div
      aria-label={`${habit.name}のメニューを開く`}
      className={cn(
        'group relative cursor-pointer rounded-2xl border border-border/60 bg-card/95 p-4 pr-12 shadow-sm transition-all duration-200 hover:border-border/80 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none'
      )}
      onClick={handleCardClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      onPointerCancel={handleLongPressEnd}
      onPointerDown={handleLongPressStart}
      onPointerLeave={handleLongPressEnd}
      onPointerMove={handleLongPressMove}
      onPointerUp={handleLongPressEnd}
      role="button"
      style={{
        opacity: dimmed ? dimmedOpacity : 1,
      }}
      tabIndex={0}
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
          aria-label={completed ? `${habit.name}のチェックインを取り消す` : `${habit.name}をチェックイン`}
          aria-pressed={completed}
          completed={completed}
          disabled={false}
          onClick={(event) => {
            event.stopPropagation()
            const handler = completed ? onRemove : onAdd
            handler?.()
          }}
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
            <span className="whitespace-nowrap font-medium text-muted-foreground text-sm tabular-nums">
              {habit.currentProgress} / {habit.frequency}
            </span>
            {habit.frequency > 1 && onAdd && onRemove && (
              <div className="flex items-center gap-1.5">
                <Button
                  aria-label="チェックインを1つ減らす"
                  className="h-8 w-8 rounded-full border border-border/70 bg-background/95 p-0 text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:opacity-45"
                  disabled={habit.currentProgress <= 0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove()
                  }}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Icon className="h-4 w-4" name="minus" />
                </Button>
                <Button
                  aria-label="チェックインを1つ増やす"
                  className="h-8 w-8 rounded-full border border-border/70 bg-background/95 p-0 text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:opacity-45"
                  disabled={habit.currentProgress >= habit.frequency}
                  onClick={(e) => {
                    e.stopPropagation()
                    onAdd()
                  }}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Icon className="h-4 w-4" name="plus" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1">
            <Icon className="h-4 w-4" name="flame" style={{ color: habit.streak > 0 ? colorData.color : undefined }} />
            <span
              className="font-bold text-lg tabular-nums"
              style={{ color: habit.streak > 0 ? colorData.color : undefined }}
            >
              {habit.streak}
            </span>
          </div>
          <span className="text-muted-foreground text-xs">日連続</span>
        </div>
      </div>
    </div>
  )
}
