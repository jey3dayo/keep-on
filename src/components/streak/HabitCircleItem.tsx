'use client'

import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/basics/Button'
import { Icon, normalizeIconName } from '@/components/basics/Icon'
import { getProgressRingDurationMs, ProgressRing } from '@/components/streak/ProgressRing'
import { getIconById } from '@/constants/habit-data'
import {
  HABIT_INVERSION_DURATION_MS,
  LONG_PRESS_DURATION_MS,
  LONG_PRESS_MOVE_THRESHOLD_PX,
} from '@/constants/interaction'
import { cn } from '@/lib/utils'
import type { HabitWithProgress } from '@/types/habit'

/** 短タップのチェックインで進行表示がチラつかないための遅延 */
const LONG_PRESS_VISUAL_DELAY_MS = 100

interface HabitCircleItemProps {
  bgColor: string
  completionPulseDelayMs?: number
  habit: HabitWithProgress
  isCompleted: boolean
  isCompletionPulseActive?: boolean
  onAddCheckin?: () => void
  onCheckin: (event: React.MouseEvent<HTMLButtonElement>) => void
  onContextMenu: (e: React.MouseEvent) => void
  onLongPressEnd: (resetTriggered: boolean) => void
  onLongPressMove: (event: React.PointerEvent<HTMLButtonElement>) => void
  onLongPressStart: (event: React.PointerEvent<HTMLButtonElement>) => void
  onRemoveCheckin?: () => void
  ringBgColor: string
}

export function HabitCircleItem({
  bgColor,
  completionPulseDelayMs = 0,
  habit,
  isCompleted,
  isCompletionPulseActive = false,
  onAddCheckin,
  onCheckin,
  onContextMenu,
  onLongPressEnd,
  onLongPressMove,
  onLongPressStart,
  onRemoveCheckin,
  ringBgColor,
}: HabitCircleItemProps) {
  const IconComponent = getIconById(normalizeIconName(habit.icon)).icon
  const progressPercent = Math.min((habit.currentProgress / habit.frequency) * 100, 100)
  const [isHolding, setIsHolding] = useState(false)
  const holdStartPointRef = useRef<{ x: number; y: number } | null>(null)
  const visualDelayTimerRef = useRef<NodeJS.Timeout | null>(null)
  const previousIsCompletedRef = useRef(isCompleted)
  const [previousProgress, setPreviousProgress] = useState(progressPercent)
  const [progressTransitionDurationMs, setProgressTransitionDurationMs] = useState(() => getProgressRingDurationMs(0))
  if (previousProgress !== progressPercent) {
    setPreviousProgress(progressPercent)
    setProgressTransitionDurationMs(getProgressRingDurationMs(Math.abs(progressPercent - previousProgress)))
  }
  const completionTransitionDelayMs = isCompleted ? progressTransitionDurationMs : 0
  const fillDurationMs = LONG_PRESS_DURATION_MS - LONG_PRESS_VISUAL_DELAY_MS

  useEffect(() => {
    const becameCompleted = !previousIsCompletedRef.current && isCompleted
    previousIsCompletedRef.current = isCompleted
    if (!becameCompleted || typeof navigator === 'undefined') {
      return
    }

    try {
      navigator.vibrate?.(10)
    } catch {
      // Vibration API が公開されていても拒否される環境があるため、UI の状態更新は妨げない。
    }
  }, [isCompleted])

  const clearHold = useCallback(() => {
    if (visualDelayTimerRef.current) {
      clearTimeout(visualDelayTimerRef.current)
      visualDelayTimerRef.current = null
    }
    setIsHolding(false)
    holdStartPointRef.current = null
  }, [])

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      holdStartPointRef.current = { x: event.clientX, y: event.clientY }
      visualDelayTimerRef.current = setTimeout(() => {
        setIsHolding(true)
        visualDelayTimerRef.current = null
      }, LONG_PRESS_VISUAL_DELAY_MS)
      onLongPressStart(event)
    },
    [onLongPressStart]
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const startPoint = holdStartPointRef.current
      if (startPoint) {
        const deltaX = event.clientX - startPoint.x
        const deltaY = event.clientY - startPoint.y
        if (Math.hypot(deltaX, deltaY) > LONG_PRESS_MOVE_THRESHOLD_PX) {
          clearHold()
        }
      }
      onLongPressMove(event)
    },
    [clearHold, onLongPressMove]
  )

  const handlePointerEnd = useCallback(
    (resetTriggered: boolean) => {
      clearHold()
      onLongPressEnd(resetTriggered)
    },
    [clearHold, onLongPressEnd]
  )

  const handlePointerCancel = useCallback(() => handlePointerEnd(true), [handlePointerEnd])
  const handlePointerLeave = useCallback(() => handlePointerEnd(true), [handlePointerEnd])
  const handlePointerUp = useCallback(() => handlePointerEnd(false), [handlePointerEnd])
  const handleRemoveCheckin = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      onRemoveCheckin?.()
    },
    [onRemoveCheckin]
  )
  const handleAddCheckin = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      onAddCheckin?.()
    },
    [onAddCheckin]
  )

  return (
    <div className="flex scale-100 starting:scale-[0.96] flex-col items-center gap-3 opacity-100 starting:opacity-0 transition-[opacity,scale] duration-200 ease-[var(--ease-out)] motion-reduce:transition-none">
      <Button
        aria-label={isCompleted ? `${habit.name}のチェックインを取り消す` : `${habit.name}をチェックイン`}
        className="relative h-[140px] w-[140px] p-0 transition-transform duration-160 ease-out hover:bg-transparent focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-0 motion-reduce:active:scale-100"
        onClick={onCheckin}
        onContextMenu={onContextMenu}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        // DESIGN.md:330 に従い、高頻度チェックインは押下反応だけ残して hover 拡大を使わない。
        scale="none"
        type="button"
        variant="ghost"
      >
        <div
          aria-hidden="true"
          className={cn(
            'absolute inset-0 scale-100 opacity-100 transition-[opacity,scale] duration-120 ease-[var(--ease-out)] motion-reduce:transition-none',
            isCompleted && 'scale-[0.94] opacity-0'
          )}
          style={{ transitionDelay: `${completionTransitionDelayMs}ms` }}
        >
          <ProgressRing
            backgroundColor={ringBgColor}
            duration={progressTransitionDurationMs}
            progress={progressPercent}
            progressColor="rgba(255, 255, 255, 0.95)"
            size={140}
            strokeWidth={6}
          />
        </div>

        <div
          className={cn(
            'relative flex h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-full ring-1 ring-white/15 transition-[scale,background-color] [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1),var(--ease-out)] motion-reduce:transition-none',
            isCompleted && 'scale-[1.03]',
            isCompletionPulseActive && 'habit-completion-pulse motion-reduce:animate-none'
          )}
          style={
            {
              '--habit-completion-pulse-delay': `${completionPulseDelayMs}ms`,
              backgroundColor: isCompleted ? 'rgba(255, 255, 255, 0.95)' : bgColor,
              transitionDelay: `${completionTransitionDelayMs}ms`,
              transitionDuration: `${HABIT_INVERSION_DURATION_MS}ms`,
            } as CSSProperties
          }
        >
          <div
            aria-hidden="true"
            className={cn(
              'long-press-fill pointer-events-none absolute inset-0 rounded-full',
              isCompleted ? 'bg-black/10' : 'bg-white/30'
            )}
            data-active={isHolding ? 'true' : undefined}
            style={{ '--long-press-fill-ms': `${fillDurationMs}ms` } as CSSProperties}
          />
          <IconComponent
            className="relative h-14 w-14 transition-colors ease-[var(--ease-out)] motion-reduce:transition-none"
            strokeWidth={1.5}
            style={{
              color: isCompleted ? bgColor : 'rgba(255, 255, 255, 0.9)',
              transitionDelay: `${completionTransitionDelayMs}ms`,
              transitionDuration: `${HABIT_INVERSION_DURATION_MS}ms`,
            }}
          />
        </div>
      </Button>

      <div className="flex flex-col items-center gap-2">
        <p
          className={cn(
            'max-w-[160px] text-center font-medium text-base text-white leading-tight',
            isCompleted && 'opacity-80'
          )}
        >
          {habit.name}
        </p>

        {habit.frequency > 1 && (
          <div className="flex items-center gap-2">
            <Button
              aria-label="チェックインを減らす"
              // 円形の見た目(h-7 w-7 = 28px)を保つため、当たり判定は ::after のエキスパンダで
              // 44px(inset-2=8px×2) に広げる。gap-2(8px)の間に進捗表示の span があり、
              // 両ボタンのエキスパンダは span の手前で収まるため互いに重ならない
              className="relative h-7 w-7 rounded-full bg-white/10 p-0 text-white after:absolute after:-inset-2 after:content-[''] hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-0"
              disabled={habit.currentProgress === 0}
              onClick={handleRemoveCheckin}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Icon className="h-4 w-4" name="minus" />
            </Button>

            <span className="min-w-[3rem] text-center font-medium text-sm text-white tabular-nums">
              {habit.currentProgress} / {habit.frequency}
            </span>

            <Button
              aria-label="チェックインを増やす"
              // 円形の見た目(h-7 w-7 = 28px)を保つため、当たり判定は ::after のエキスパンダで
              // 44px(inset-2=8px×2) に広げる。−ボタンとの間には進捗表示の span(min-w-3rem)があり、
              // エキスパンダは gap-2(8px)を埋めて span の端で止まるため、−ボタンとは重ならない
              className="relative h-7 w-7 rounded-full bg-white/10 p-0 text-white after:absolute after:-inset-2 after:content-[''] hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-0"
              disabled={isCompleted}
              onClick={handleAddCheckin}
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
  )
}
