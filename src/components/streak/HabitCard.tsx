'use client'

import { Button } from '@/components/basics/Button'
import { Icon, normalizeIconName } from '@/components/basics/Icon'
import { HabitCardToggleButton } from '@/components/streak/HabitCardToggleButton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { COMPLETION_STATUS_LABEL, DEFAULT_HABIT_COLOR, PERIOD_LABEL } from '@/constants/habit'
import { getColorById } from '@/constants/habit-data'
import { cn } from '@/lib/utils'
import type { HabitWithProgress } from '@/types/habit'

interface HabitCardProps {
  habit: HabitWithProgress
  completed: boolean
  onToggle: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function HabitCard({ habit, completed, onToggle, onEdit, onDelete }: HabitCardProps) {
  const bgColor = getColorById(habit.color ?? DEFAULT_HABIT_COLOR).color
  const isCompleted = habit.currentProgress >= habit.frequency

  return (
    <div className="relative">
      {/* 編集メニューボタン */}
      {(onEdit || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="メニューを開く"
              className="absolute top-2 right-2 z-10 rounded-full p-1.5 text-white/80 hover:bg-black/20 hover:text-white"
              onClick={(e) => {
                e.stopPropagation()
              }}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Icon className="h-4 w-4" name="more-horizontal" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
              >
                <Icon className="mr-2 h-4 w-4" name="pencil" />
                編集
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
              >
                <Icon className="mr-2 h-4 w-4" name="trash" />
                削除
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <HabitCardToggleButton
        aria-checked={completed}
        aria-label={`${habit.name} - ${isCompleted ? COMPLETION_STATUS_LABEL.completed : COMPLETION_STATUS_LABEL.incomplete} (${habit.currentProgress}/${habit.frequency})`}
        className={cn(completed && 'scale-95')}
        onClick={onToggle}
        role="checkbox"
        style={{ backgroundColor: bgColor }}
      >
        <div className="flex w-full flex-col gap-4">
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
      </HabitCardToggleButton>
    </div>
  )
}
