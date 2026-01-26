'use client'

import { Icon, normalizeIconName } from '@/components/Icon'
import { Progress } from '@/components/ui/progress'
import { PERIOD_LABEL } from '@/constants/habit'
import { getColorById } from '@/lib/habit-data'
import { cn } from '@/lib/utils'
import type { HabitWithProgress } from '@/types/habit'

interface HabitCardProps {
  habit: HabitWithProgress
  completed: boolean
  onToggle: () => void
}

export function HabitCard({ habit, completed, onToggle }: HabitCardProps) {
  const bgColor = getColorById(habit.color ?? 'orange').color
  const isCompleted = habit.currentProgress >= habit.frequency

  return (
    <button
      aria-checked={completed}
      aria-label={`${habit.name} - ${isCompleted ? '完了' : '未完了'} (${habit.currentProgress}/${habit.frequency})`}
      className={cn(
        'relative rounded-lg p-6 text-white transition-all',
        'hover:scale-102 hover:shadow-lg',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        completed && 'scale-95'
      )}
      onClick={onToggle}
      role="checkbox"
      style={{ backgroundColor: bgColor }}
      type="button"
    >
      <div className="flex flex-col gap-4">
        {/* アイコンとストリーク */}
        <div className="flex items-center justify-between">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-black/20">
            <Icon className="h-8 w-8" name={normalizeIconName(habit.icon)} />
            {completed && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
                <Icon className="h-8 w-8" name="check" />
              </div>
            )}
          </div>

          {/* ストリーク表示 */}
          {habit.streak > 0 && (
            <div className="flex flex-col items-end">
              <span className="text-xs opacity-80">ストリーク</span>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-2xl">{habit.streak}</span>
                <span className="text-sm">{PERIOD_LABEL[habit.period]}</span>
              </div>
            </div>
          )}
        </div>

        {/* 習慣名 */}
        <span className="text-left font-medium text-base">{habit.name}</span>

        {/* 進捗バー */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs opacity-90">
            <span>
              {habit.currentProgress} / {habit.frequency}
            </span>
            <span>{habit.completionRate}%</span>
          </div>
          <Progress className="h-2 bg-black/20" indicatorClassName="bg-white" value={habit.completionRate} />
        </div>
      </div>
    </button>
  )
}
