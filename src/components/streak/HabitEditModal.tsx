'use client'

import {
  Apple,
  Bike,
  BookOpen,
  Brain,
  Camera,
  Clock,
  Coffee,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  type LucideIcon,
  Moon,
  Music,
  Palette,
  Pill,
  Sparkles,
  Target,
} from 'lucide-react'
import { useState } from 'react'
import { Icon, normalizeIconName } from '@/components/Icon'
import { Button } from '@/components/ui/button'
import { DEFAULT_HABIT_COLOR, DEFAULT_HABIT_ICON, type Period } from '@/constants/habit'
import { habitColors, taskPeriods } from '@/constants/habit-data'
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

  // アイコンマッピング
  const iconMap: Record<string, LucideIcon> = {
    droplets: Droplets,
    dumbbell: Dumbbell,
    'book-open': BookOpen,
    moon: Moon,
    heart: Heart,
    apple: Apple,
    brain: Brain,
    music: Music,
    camera: Camera,
    palette: Palette,
    coffee: Coffee,
    bike: Bike,
    footprints: Footprints,
    pill: Pill,
    clock: Clock,
    sparkles: Sparkles,
    target: Target,
    flame: Flame,
  }

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
          <button
            aria-label="閉じる"
            className="rounded-full p-2 transition-colors hover:bg-secondary"
            onClick={onClose}
            type="button"
          >
            <Icon className="h-5 w-5 text-muted-foreground" name="x" />
          </button>
          <h2 className="font-semibold text-foreground text-lg">習慣を編集</h2>
          <Button
            aria-label="保存"
            className="rounded-full p-2"
            disabled={!habitName.trim()}
            onClick={handleSave}
            size="icon"
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
              <Icon className="h-12 w-12 text-white" name={normalizeIconName(selectedIcon)} />
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
              {Object.entries(iconMap).map(([iconId, IconComponent]) => {
                const isSelected = selectedIcon === iconId
                return (
                  <button
                    aria-label={`アイコン ${iconId}`}
                    className={cn(
                      'flex items-center justify-center rounded-xl p-2.5 transition-all',
                      isSelected ? 'scale-110 ring-2 ring-ring' : 'hover:bg-secondary'
                    )}
                    key={iconId}
                    onClick={() => setSelectedIcon(iconId)}
                    style={{
                      backgroundColor: isSelected ? selectedColorValue : undefined,
                    }}
                    type="button"
                  >
                    <IconComponent
                      className={cn('h-5 w-5', isSelected ? 'text-white' : 'text-muted-foreground')}
                      strokeWidth={1.5}
                    />
                  </button>
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
                  <button
                    aria-label={`カラー ${colorItem.label}`}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full transition-all',
                      isSelected && 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-card'
                    )}
                    key={colorItem.id}
                    onClick={() => setSelectedColor(colorItem.id)}
                    style={{ backgroundColor: colorItem.color }}
                    type="button"
                  >
                    {isSelected && <Icon className="h-4 w-4 text-white" name="check" />}
                  </button>
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
                  <button
                    aria-label={period.label}
                    className={cn(
                      'rounded-xl border px-3 py-2.5 transition-all',
                      isSelected ? 'border-transparent' : 'border-border bg-secondary/50 hover:bg-secondary'
                    )}
                    key={period.id}
                    onClick={() => setSelectedPeriod(period.id)}
                    style={{
                      backgroundColor: isSelected ? `${selectedColorValue}30` : undefined,
                      borderColor: isSelected ? selectedColorValue : undefined,
                    }}
                    type="button"
                  >
                    <span
                      className={cn('font-medium text-sm', isSelected ? 'text-foreground' : 'text-muted-foreground')}
                      style={{ color: isSelected ? selectedColorValue : undefined }}
                    >
                      {period.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <span className="font-medium text-muted-foreground text-sm uppercase tracking-wide">目標回数</span>
            <div className="flex items-center gap-4">
              <button
                aria-label="減らす"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary font-medium text-foreground text-xl transition-colors hover:bg-secondary/80"
                onClick={() => setFrequency(Math.max(1, frequency - 1))}
                type="button"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <span className="font-bold text-3xl text-foreground">{frequency}</span>
                <span className="ml-2 text-muted-foreground text-sm">{currentPeriod.frequencyLabel}</span>
              </div>
              <button
                aria-label="増やす"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary font-medium text-foreground text-xl transition-colors hover:bg-secondary/80"
                onClick={() => setFrequency(Math.min(99, frequency + 1))}
                type="button"
              >
                +
              </button>
            </div>
          </div>

          {/* Delete Button */}
          <div className="border-border border-t pt-4">
            {showDeleteConfirm ? (
              <div className="space-y-3">
                <p className="text-center text-muted-foreground text-sm">本当にこの習慣を削除しますか？</p>
                <div className="flex gap-3">
                  <button
                    className="flex-1 rounded-xl bg-secondary py-3 font-medium text-foreground transition-colors hover:bg-secondary/80"
                    onClick={() => setShowDeleteConfirm(false)}
                    type="button"
                  >
                    キャンセル
                  </button>
                  <button
                    className="flex-1 rounded-xl bg-destructive py-3 font-medium text-white transition-colors hover:bg-destructive/90"
                    onClick={handleDelete}
                    type="button"
                  >
                    削除する
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-destructive transition-colors hover:bg-destructive/10"
                onClick={() => setShowDeleteConfirm(true)}
                type="button"
              >
                <Icon className="h-5 w-5" name="trash-2" />
                <span className="font-medium">この習慣を削除</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
