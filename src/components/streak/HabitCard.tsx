'use client'

import { Icon, type IconName } from '@/components/Icon'
import { cn } from '@/lib/utils'

interface Habit {
  id: string
  name: string
  icon: string | null
}

interface HabitCardProps {
  habit: Habit
  completed: boolean
  onToggle: () => void
}

export function HabitCard({ habit, completed, onToggle }: HabitCardProps) {
  return (
    <button
      aria-checked={completed}
      aria-label={`${habit.name} - ${completed ? '完了' : '未完了'}`}
      className={cn(
        'relative rounded-lg bg-primary p-6 text-white transition-all',
        'hover:scale-102 hover:shadow-lg',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        completed && 'scale-95'
      )}
      onClick={onToggle}
      role="checkbox"
      type="button"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-black/20">
          <Icon className="h-10 w-10" name={(habit.icon as IconName) || 'circle-check'} />
          {completed && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
              <Icon className="h-10 w-10" name="check" />
            </div>
          )}
        </div>
        <span className="text-center font-medium text-base">{habit.name}</span>
      </div>
    </button>
  )
}
