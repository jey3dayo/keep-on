'use client'

import { Button } from '@/components/basics/Button'
import { Icon, type IconName } from '@/components/basics/Icon'
import { COMPLETION_STATUS_LABEL } from '@/constants/habit'
import { cn } from '@/lib/utils'

interface TaskCircleProps {
  habitId: string
  habitName: string
  icon?: IconName
  color?: string | null
  completed: boolean
  onToggle: (habitId: string) => void
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES = {
  sm: 'w-20 h-20',
  md: 'w-32 h-32',
  lg: 'w-40 h-40',
} as const

const ICON_SIZE_CLASSES = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
} as const

const TEXT_SIZE_CLASSES = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
} as const

const DEFAULT_BORDER_COLOR = 'rgba(255, 255, 255, 0.4)'
const DEFAULT_ICON: IconName = 'circle-check'

export function TaskCircle({
  habitId,
  habitName,
  icon = DEFAULT_ICON,
  color,
  completed,
  onToggle,
  size = 'md',
}: TaskCircleProps) {
  // カラーをborder-colorに適用
  const borderColor = color ? `oklch(from ${color} l c h)` : DEFAULT_BORDER_COLOR

  return (
    <Button
      aria-checked={completed}
      aria-label={`${habitName} - ${completed ? COMPLETION_STATUS_LABEL.completed : COMPLETION_STATUS_LABEL.incomplete}`}
      className="h-auto flex-col whitespace-normal break-words p-0 hover:bg-transparent"
      onClick={() => onToggle(habitId)}
      role="checkbox"
      scale="md"
      type="button"
      variant="ghost"
    >
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full border-4 bg-transparent',
          SIZE_CLASSES[size],
          completed && 'scale-95'
        )}
        style={{ borderColor }}
      >
        <Icon className={cn('text-white', ICON_SIZE_CLASSES[size])} name={icon} />
        {completed && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
            <Icon className={cn('text-white', ICON_SIZE_CLASSES[size])} name="check" />
          </div>
        )}
      </div>
      <span className={cn('text-center font-medium text-white', TEXT_SIZE_CLASSES[size])}>{habitName}</span>
    </Button>
  )
}
