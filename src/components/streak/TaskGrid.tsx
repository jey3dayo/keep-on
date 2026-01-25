'use client'

import type { IconName } from '@/components/Icon'
import { Icon } from '@/components/Icon'
import { TaskCircle } from './TaskCircle'

interface Habit {
  id: string
  name: string
  icon: string | null
}

interface TaskGridProps {
  habits: Habit[]
  completedHabitIds: Set<string>
  onToggleHabit: (habitId: string) => void
  onAddClick: () => void
}

export function TaskGrid({ habits, completedHabitIds, onToggleHabit, onAddClick }: TaskGridProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-8">
      <div className="mx-auto grid max-w-md grid-cols-2 gap-6">
        {habits.map((habit) => (
          <TaskCircle
            completed={completedHabitIds.has(habit.id)}
            habitId={habit.id}
            habitName={habit.name}
            icon={(habit.icon as IconName) || 'circle-check'}
            key={habit.id}
            onToggle={onToggleHabit}
          />
        ))}
        <button
          aria-label="タスクを追加"
          className="flex flex-col items-center gap-2 transition-transform active:scale-95"
          onClick={onAddClick}
          type="button"
        >
          <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white/40 border-dashed bg-transparent">
            <Icon className="h-12 w-12 text-white" name="plus" />
          </div>
          <span className="font-medium text-sm text-white/80">追加</span>
        </button>
      </div>
    </div>
  )
}
