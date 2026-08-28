'use client'

import type { CSSProperties, KeyboardEvent, ReactNode, PointerEvent as ReactPointerEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, CheckInButton } from '@/components/basics/Button'
import { Icon, normalizeIconName } from '@/components/basics/Icon'
import { DEFAULT_HABIT_COLOR } from '@/constants/habit'
import { getColorById, getIconById, getPeriodById } from '@/constants/habit-data'
import { LONG_PRESS_DURATION_MS, LONG_PRESS_MOVE_THRESHOLD_PX } from '@/constants/interaction'
import { cn } from '@/lib/utils'
import type { HabitWithProgress } from '@/types/habit'

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
  const allowIconMotionRef = useRef(false)
  const badgeBackgroundColor = `var(--${colorData.id}-a4)`

  const progressPercent = Math.min((habit.currentProgress / habit.frequency) * 100, 100)

  useEffect(() => {
    allowIconMotionRef.current = true
  }, [])

  const handleLongPressStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      longPressTriggeredRef.current = false
      longPressStartPointRef.current = { x: event.clientX, y: event.clientY }
      longPressTimerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true
        onLongPressOrContextMenu()
      }, LONG_PRESS_DURATION_MS)
    },
    [onLongPressOrContextMenu]
  )

  const handleLongPressMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
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
  }, [])

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressStartPointRef.current = null
  }, [])

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      longPressTriggeredRef.current = true
      onLongPressOrContextMenu()
    },
    [onLongPressOrContextMenu]
  )

  const handleCardClick = useCallback(() => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false
      return
    }
    onLongPressOrContextMenu()
  }, [onLongPressOrContextMenu])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) {
        return
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onLongPressOrContextMenu()
      }
    },
    [onLongPressOrContextMenu]
  )

  const handleMenuClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      onLongPressOrContextMenu()
    },
    [onLongPressOrContextMenu]
  )
  const handleButtonPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => event.stopPropagation(),
    []
  )
  const handleCheckin = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      ;(completed ? onRemove : onAdd)?.()
    },
    [completed, onAdd, onRemove]
  )
  const handleRemove = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      onRemove?.()
    },
    [onRemove]
  )
  const handleAdd = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      onAdd?.()
    },
    [onAdd]
  )

  return (
    <div
      aria-label={`${habit.name}のメニューを開く`}
      className={cn(
        'group relative cursor-pointer rounded-2xl border border-border/60 bg-card/95 p-4 pr-12 shadow-sm transition-[border-color,box-shadow,opacity] duration-200 hover:border-border/80 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none'
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
        // 見た目(h-8 w-8 = 32px)は変えず、既に absolute 配置のため ::after の
        // エキスパンダで当たり判定だけ 44px(inset-1.5=6px×2) に広げる（relative は不要）
        className="absolute top-3 right-3 h-8 w-8 rounded-full text-muted-foreground after:absolute after:-inset-1.5 after:content-[''] hover:text-foreground"
        onClick={handleMenuClick}
        onPointerDown={handleButtonPointerDown}
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
          onClick={handleCheckin}
          style={
            {
              '--tw-ring-color': colorData.color,
              backgroundColor: colorData.color,
              opacity: completed ? 1 : 0.85,
            } as CSSProperties
          }
        >
          <CheckInIconSwap animate={allowIconMotionRef.current} key={completed ? 'completed' : 'pending'}>
            {completed ? (
              <Icon className="h-7 w-7 text-background" name="check" />
            ) : (
              <IconComponent className="h-7 w-7 text-background" />
            )}
          </CheckInIconSwap>
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
                className="h-full w-full rounded-full transition-transform duration-300 ease-out motion-reduce:transition-none"
                style={{
                  backgroundColor: colorData.color,
                  transform: `translateX(-${100 - progressPercent}%)`,
                }}
              />
            </div>
            <span className="whitespace-nowrap font-medium text-muted-foreground text-sm tabular-nums">
              {habit.currentProgress} / {habit.frequency}
            </span>
            {habit.frequency > 1 && onAdd && onRemove && (
              // 44px の −/＋ ボタンが誤タップで隣接し増減を取り違えないよう gap-2(8px) を確保
              <div className="flex items-center gap-2">
                <Button
                  aria-label="チェックインを1つ減らす"
                  className="h-11 w-11 rounded-full border border-border/70 bg-background/95 p-0 text-foreground shadow-sm transition-[color,background-color,transform] duration-160 ease-out hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 active:scale-95 disabled:opacity-45 motion-reduce:transition-none motion-reduce:active:scale-100"
                  disabled={habit.currentProgress <= 0}
                  onClick={handleRemove}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Icon className="h-4 w-4" name="minus" />
                </Button>
                <Button
                  aria-label="チェックインを1つ増やす"
                  className="h-11 w-11 rounded-full border border-border/70 bg-background/95 p-0 text-foreground shadow-sm transition-[color,background-color,transform] duration-160 ease-out hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 active:scale-95 disabled:opacity-45 motion-reduce:transition-none motion-reduce:active:scale-100"
                  disabled={habit.currentProgress >= habit.frequency}
                  onClick={handleAdd}
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

/**
 * チェックイン状態の切替時だけアイコンを微細に入場させる。
 * 初回マウント（一覧表示）では動かさない。親が key でリマウントする前提。
 */
function CheckInIconSwap({ animate, children }: { animate: boolean; children: ReactNode }) {
  const [entered, setEntered] = useState(!animate)

  useEffect(() => {
    if (!animate) {
      return
    }
    const frame = requestAnimationFrame(() => {
      setEntered(true)
    })
    return () => cancelAnimationFrame(frame)
  }, [animate])

  return (
    <span className="checkin-icon-enter" data-entered={entered ? 'true' : undefined}>
      {children}
    </span>
  )
}
