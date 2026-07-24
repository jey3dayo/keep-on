'use client'

import { type CSSProperties, useRef, useState } from 'react'
import { Button } from '@/components/basics/Button'
import { Icon, normalizeIconName } from '@/components/basics/Icon'
import { ProgressRing } from '@/components/streak/ProgressRing'
import { getIconById } from '@/constants/habit-data'
import { LONG_PRESS_DURATION_MS, LONG_PRESS_MOVE_THRESHOLD_PX } from '@/constants/interaction'
import { cn } from '@/lib/utils'
import type { HabitWithProgress } from '@/types/habit'

/** 短タップのチェックインで進行表示がチラつかないための遅延 */
const LONG_PRESS_VISUAL_DELAY_MS = 100

interface HabitCircleItemProps {
  bgColor: string
  habit: HabitWithProgress
  isCompleted: boolean
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
  habit,
  isCompleted,
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
  const fillDurationMs = LONG_PRESS_DURATION_MS - LONG_PRESS_VISUAL_DELAY_MS

  const clearHold = () => {
    if (visualDelayTimerRef.current) {
      clearTimeout(visualDelayTimerRef.current)
      visualDelayTimerRef.current = null
    }
    setIsHolding(false)
    holdStartPointRef.current = null
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    holdStartPointRef.current = { x: event.clientX, y: event.clientY }
    visualDelayTimerRef.current = setTimeout(() => {
      setIsHolding(true)
      visualDelayTimerRef.current = null
    }, LONG_PRESS_VISUAL_DELAY_MS)
    onLongPressStart(event)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const startPoint = holdStartPointRef.current
    if (startPoint) {
      const deltaX = event.clientX - startPoint.x
      const deltaY = event.clientY - startPoint.y
      if (Math.hypot(deltaX, deltaY) > LONG_PRESS_MOVE_THRESHOLD_PX) {
        clearHold()
      }
    }
    onLongPressMove(event)
  }

  const handlePointerEnd = (resetTriggered: boolean) => {
    clearHold()
    onLongPressEnd(resetTriggered)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        aria-label={isCompleted ? `${habit.name}のチェックインを取り消す` : `${habit.name}をチェックイン`}
        className="relative h-[140px] w-[140px] p-0 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-0"
        onClick={onCheckin}
        onContextMenu={onContextMenu}
        onPointerCancel={() => handlePointerEnd(true)}
        onPointerDown={handlePointerDown}
        onPointerLeave={() => handlePointerEnd(true)}
        onPointerMove={handlePointerMove}
        onPointerUp={() => handlePointerEnd(false)}
        scale="md"
        type="button"
        variant="ghost"
      >
        <ProgressRing
          backgroundColor={ringBgColor}
          progress={progressPercent}
          progressColor="rgba(255, 255, 255, 0.95)"
          size={140}
          strokeWidth={6}
        />

        <div
          className={cn(
            'relative flex h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-full ring-1 ring-white/15 transition-[transform,box-shadow] duration-300 motion-reduce:transition-none',
            isCompleted && 'scale-105'
          )}
          style={{
            backgroundColor: bgColor,
            boxShadow: isCompleted ? '0 0 24px rgba(255, 255, 255, 0.35)' : 'none',
          }}
        >
          <div
            aria-hidden="true"
            className="long-press-fill pointer-events-none absolute inset-0 rounded-full bg-white/30"
            data-active={isHolding ? 'true' : undefined}
            style={{ '--long-press-fill-ms': `${fillDurationMs}ms` } as CSSProperties}
          />
          <IconComponent
            className={cn(
              'relative h-14 w-14 transition-colors duration-300 motion-reduce:transition-none',
              isCompleted ? 'text-white' : 'text-white/90'
            )}
            strokeWidth={1.5}
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
              className="h-7 w-7 rounded-full bg-white/10 p-0 text-white hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-0"
              disabled={habit.currentProgress === 0}
              onClick={(e) => {
                e.stopPropagation()
                if (onRemoveCheckin) {
                  onRemoveCheckin()
                }
              }}
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
              className="h-7 w-7 rounded-full bg-white/10 p-0 text-white hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-0"
              disabled={isCompleted}
              onClick={(e) => {
                e.stopPropagation()
                if (onAddCheckin) {
                  onAddCheckin()
                }
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
  )
}
