'use client'

import { Icon, type IconName } from '@/components/Icon'
import { cn } from '@/lib/utils'

interface TaskCircleProps {
  habitId: string
  habitName: string
  icon?: IconName
  completed: boolean
  onToggle: (habitId: string) => void
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-20 h-20',
  md: 'w-32 h-32',
  lg: 'w-40 h-40',
}

const iconSizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
}

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
}

export function TaskCircle({
  habitId,
  habitName,
  icon = 'circle-check',
  completed,
  onToggle,
  size = 'md',
}: TaskCircleProps) {
  return (
    <button
      aria-checked={completed}
      aria-label={`${habitName} - ${completed ? '完了' : '未完了'}`}
      className="flex flex-col items-center gap-2 transition-transform active:scale-95"
      onClick={() => onToggle(habitId)}
      role="checkbox"
      type="button"
    >
      <div
        className={cn(
          'task-circle-border relative flex items-center justify-center rounded-full bg-transparent',
          sizeClasses[size],
          completed && 'scale-95'
        )}
      >
        <Icon className={cn('text-white', iconSizeClasses[size])} name={icon} />
        {completed && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
            <Icon className={cn('text-white', iconSizeClasses[size])} name="check" />
          </div>
        )}
      </div>
      <span className={cn('text-center font-medium text-white', textSizeClasses[size])}>{habitName}</span>
    </button>
  )
}
