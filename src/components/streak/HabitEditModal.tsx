'use client'

import { useState } from 'react'
import { Button } from '@/components/basics/Button'
import { Icon } from '@/components/basics/Icon'
import { DEFAULT_HABIT_COLOR, DEFAULT_HABIT_ICON, type Period } from '@/constants/habit'
import { habitColors, habitIcons, taskPeriods } from '@/constants/habit-data'
import { cn } from '@/lib/utils'
import type { HabitWithProgress } from '@/types/habit'

interface HabitEditModalProps {
  habit: HabitWithProgress
  onClose: () => void
  onSave: (updatedHabit: Partial<HabitWithProgress>) => void
  onDelete: (habitId: string) => void
}

export function HabitEditModal({ habit, onClose, onSave, onDelete }: HabitEditModalProps) {
  const [habitName, setHabitName] = useState(habit.name)
  const [selectedIcon, setSelectedIcon] = useState(habit.icon ?? DEFAULT_HABIT_ICON)
  const [selectedColor, setSelectedColor] = useState(habit.color ?? DEFAULT_HABIT_COLOR)
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(habit.period)
  const [frequency, setFrequency] = useState(habit.frequency)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const selectedColorValue = habitColors.find((c) => c.id === selectedColor)?.color ?? habitColors[0].color
  const currentPeriod = taskPeriods.find((p) => p.id === selectedPeriod) ?? taskPeriods[0]

  const handleSave = () => {
    if (!habitName.trim()) {
      return
    }
    onSave({
      name: habitName.trim(),
      icon: selectedIcon,
      color: selectedColor,
      period: selectedPeriod,
      frequency,
    })
  }

  const handleDelete = () => {
    onDelete(habit.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div aria-hidden="true" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative max-h-[90vh] w-full max-w-[28rem] overflow-y-auto rounded-t-3xl bg-card shadow-2xl sm:max-w-md sm:rounded-3xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-border border-b bg-card p-4">
          <Button
            aria-label="閉じる"
            className="rounded-full p-2 hover:bg-secondary"
            onClick={onClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Icon className="h-5 w-5 text-muted-foreground" name="x" />
          </Button>
          <h2 className="font-semibold text-foreground text-lg">習慣を編集</h2>
          <Button
            aria-label="保存"
            className={cn('rounded-full p-2', habitName.trim() ? 'hover:bg-secondary' : 'text-muted-foreground')}
            disabled={!habitName.trim()}
            onClick={handleSave}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Icon className="h-5 w-5" name="check" />
          </Button>
        </div>

        <div className="space-y-6 p-4">
          {/* Icon Preview */}
          <div className="flex justify-center">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full shadow-lg"
              style={{ backgroundColor: selectedColorValue }}
            >
              {(() => {
                const IconComponent = habitIcons.find((icon) => icon.id === selectedIcon)?.icon ?? habitIcons[0].icon
                return <IconComponent className="h-12 w-12 text-white" strokeWidth={1.5} />
              })()}
            </div>
          </div>

          {/* Habit Name */}
          <div className="space-y-2">
            <span className="font-medium text-muted-foreground text-sm uppercase tracking-wide">習慣名</span>
            <input
              aria-label="習慣名"
              className="w-full rounded-xl bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={30}
              onChange={(e) => setHabitName(e.target.value)}
              placeholder="習慣の名前を入力..."
              type="text"
              value={habitName}
            />
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <span className="font-medium text-muted-foreground text-sm uppercase tracking-wide">アイコン</span>
            <div className="grid grid-cols-6 gap-2">
              {habitIcons.map((iconItem) => {
                const IconComponent = iconItem.icon
                const isSelected = selectedIcon === iconItem.id
                return (
                  <Button
                    aria-label={`アイコン ${iconItem.label}`}
                    className={cn(
                      'h-auto w-auto rounded-xl p-2.5 transition-all',
                      isSelected ? 'scale-110 ring-2 ring-ring' : 'hover:bg-secondary'
                    )}
                    key={iconItem.id}
                    onClick={() => setSelectedIcon(iconItem.id)}
                    size="icon"
                    style={{
                      backgroundColor: isSelected ? selectedColorValue : undefined,
                    }}
                    type="button"
                    variant="ghost"
                  >
                    <IconComponent
                      className={cn('h-5 w-5', isSelected ? 'text-white' : 'text-muted-foreground')}
                      strokeWidth={1.5}
                    />
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <span className="font-medium text-muted-foreground text-sm uppercase tracking-wide">カラー</span>
            <div className="flex flex-wrap gap-2">
              {habitColors.map((colorItem) => {
                const isSelected = selectedColor === colorItem.id
                return (
                  <Button
                    aria-label={`カラー ${colorItem.label}`}
                    className={cn(
                      'h-9 w-9 rounded-full transition-all',
                      isSelected && 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-card'
                    )}
                    key={colorItem.id}
                    onClick={() => setSelectedColor(colorItem.id)}
                    size="icon"
                    style={{ backgroundColor: colorItem.color }}
                    type="button"
                    variant="ghost"
                  >
                    {isSelected && <Icon className="h-4 w-4 text-white" name="check" />}
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Period Selection */}
          <div className="space-y-2">
            <span className="font-medium text-muted-foreground text-sm uppercase tracking-wide">タスクの種類</span>
            <div className="grid grid-cols-3 gap-2">
              {taskPeriods.map((period) => {
                const isSelected = selectedPeriod === period.id
                return (
                  <Button
                    aria-label={period.label}
                    className={cn(
                      'h-auto rounded-xl border px-3 py-2.5 transition-all',
                      isSelected ? 'border-transparent' : 'border-border bg-secondary/50 hover:bg-secondary'
                    )}
                    key={period.id}
                    onClick={() => setSelectedPeriod(period.id)}
                    style={{
                      backgroundColor: isSelected ? `${selectedColorValue}30` : undefined,
                      borderColor: isSelected ? selectedColorValue : undefined,
                    }}
                    type="button"
                    variant="ghost"
                  >
                    <span
                      className={cn('font-medium text-sm', isSelected ? 'text-foreground' : 'text-muted-foreground')}
                      style={{ color: isSelected ? selectedColorValue : undefined }}
                    >
                      {period.label}
                    </span>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <span className="font-medium text-muted-foreground text-sm uppercase tracking-wide">目標回数</span>
            <div className="flex items-center gap-4">
              <Button
                aria-label="減らす"
                className="h-10 w-10 rounded-full text-xl"
                onClick={() => setFrequency(Math.max(1, frequency - 1))}
                size="icon"
                type="button"
                variant="secondary"
              >
                −
              </Button>
              <div className="flex-1 text-center">
                <span className="font-bold text-3xl text-foreground">{frequency}</span>
                <span className="ml-2 text-muted-foreground text-sm">{currentPeriod.frequencyLabel}</span>
              </div>
              <Button
                aria-label="増やす"
                className="h-10 w-10 rounded-full text-xl"
                onClick={() => setFrequency(Math.min(99, frequency + 1))}
                size="icon"
                type="button"
                variant="secondary"
              >
                +
              </Button>
            </div>
          </div>

          {/* Delete Button */}
          <div className="border-border border-t pt-4">
            {showDeleteConfirm ? (
              <div className="space-y-3">
                <p className="text-center text-muted-foreground text-sm">本当にこの習慣を削除しますか？</p>
                <div className="flex gap-3">
                  <Button
                    className="flex-1 rounded-xl py-3"
                    onClick={() => setShowDeleteConfirm(false)}
                    type="button"
                    variant="secondary"
                  >
                    キャンセル
                  </Button>
                  <Button
                    className="flex-1 rounded-xl py-3 text-white"
                    onClick={handleDelete}
                    type="button"
                    variant="destructive"
                  >
                    削除する
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                className="h-auto w-full justify-center gap-2 rounded-xl py-3 text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteConfirm(true)}
                type="button"
                variant="ghost"
              >
                <Icon className="h-5 w-5" name="trash-2" />
                <span className="font-medium">この習慣を削除</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
