'use client'

import { Button } from '@/components/basics/Button'
import { Icon, normalizeIconName } from '@/components/basics/Icon'
import { ProgressRing } from '@/components/streak/ProgressRing'
import { getIconById } from '@/constants/habit-data'
import { cn } from '@/lib/utils'
import type { HabitWithProgress } from '@/types/habit'

interface HabitCircleItemProps {
  bgColor: string
  habit: HabitWithProgress
  isCompleted: boolean
  onAddCheckin?: () => void
  onCheckin: (event: React.MouseEvent<HTMLButtonElement>) => void
  onContextMenu: (e: React.MouseEvent) => void
  onLongPressEnd: (resetTriggered: boolean) => void
  onLongPressStart: () => void
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
  onLongPressStart,
  onRemoveCheckin,
  ringBgColor,
}: HabitCircleItemProps) {
  const IconComponent = getIconById(normalizeIconName(habit.icon)).icon
  const progressPercent = Math.min((habit.currentProgress / habit.frequency) * 100, 100)

  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        aria-label={isCompleted ? '達成済み' : `${habit.name}をチェックイン`}
        className="relative h-[140px] w-[140px] p-0 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-0"
        disabled={isCompleted}
        onClick={onCheckin}
        onContextMenu={onContextMenu}
        onPointerCancel={() => onLongPressEnd(true)}
        onPointerDown={onLongPressStart}
        onPointerLeave={() => onLongPressEnd(true)}
        onPointerUp={() => onLongPressEnd(false)}
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
            'flex h-[120px] w-[120px] items-center justify-center rounded-full ring-1 ring-white/15 transition-all duration-300',
            isCompleted && 'scale-105'
          )}
          style={{
            backgroundColor: bgColor,
            boxShadow: isCompleted ? '0 0 24px rgba(255, 255, 255, 0.35)' : 'none',
          }}
        >
          <IconComponent
            className={cn('h-14 w-14 transition-all duration-300', isCompleted ? 'text-white' : 'text-white/90')}
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

            <span className="min-w-[3rem] text-center font-medium text-sm text-white">
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
