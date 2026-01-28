'use client'

import { Check, ChevronLeft, Clock } from 'lucide-react'
import { type CSSProperties, useMemo, useState } from 'react'
import { Button } from '@/components/basics/Button'
import type { IconName } from '@/components/basics/Icon'
import {
  DEFAULT_HABIT_COLOR,
  DEFAULT_HABIT_FREQUENCY,
  DEFAULT_HABIT_ICON,
  DEFAULT_HABIT_PERIOD,
  type Period,
} from '@/constants/habit'
import type { HabitPreset } from '@/constants/habit-data'
import { getColorById, getIconById, getPeriodById, habitColors, habitIcons, taskPeriods } from '@/constants/habit-data'
import { cn } from '@/lib/utils'

interface HabitFormProps {
  onBack: () => void
  onSubmit: (input: { name: string; icon: IconName; color: string; period: Period; frequency: number }) => Promise<void>
  preset?: HabitPreset | null
}

export function HabitForm({ onBack, onSubmit, preset }: HabitFormProps) {
  const [habitName, setHabitName] = useState(preset?.name ?? '')
  const [selectedIcon, setSelectedIcon] = useState<IconName>(preset?.iconId ?? DEFAULT_HABIT_ICON)
  const [selectedColor, setSelectedColor] = useState(preset?.colorId ?? DEFAULT_HABIT_COLOR)
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(preset?.period ?? DEFAULT_HABIT_PERIOD)
  const [frequency, setFrequency] = useState(preset?.frequency ?? DEFAULT_HABIT_FREQUENCY)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedColorValue = useMemo(() => getColorById(selectedColor).color, [selectedColor])
  const SelectedIconComponent = useMemo(() => getIconById(selectedIcon).icon, [selectedIcon])
  const currentPeriod = useMemo(() => getPeriodById(selectedPeriod), [selectedPeriod])

  const handleSave = async () => {
    if (!habitName.trim() || isSubmitting) {
      return
    }
    setIsSubmitting(true)
    await onSubmit({
      name: habitName.trim(),
      icon: selectedIcon,
      color: selectedColor,
      period: selectedPeriod,
      frequency,
    })
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-border/50 border-b bg-background/50 px-4 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/30">
        <Button
          className="h-auto gap-1 p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
          onClick={onBack}
          type="button"
          variant="ghost"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm">戻る</span>
        </Button>
        <h1 className="font-semibold text-foreground text-lg">新しい習慣</h1>
        <Button
          className={cn(
            habitName.trim() && !isSubmitting
              ? 'text-foreground hover:opacity-80'
              : 'cursor-not-allowed text-muted-foreground'
          )}
          disabled={!habitName.trim() || isSubmitting}
          onClick={handleSave}
          style={{ color: habitName.trim() && !isSubmitting ? selectedColorValue : undefined }}
          type="button"
          variant="ghost"
        >
          {isSubmitting ? <Check className="h-5 w-5" /> : '保存'}
        </Button>
      </header>

      <div className="space-y-8 px-4 py-6">
        <div className="flex flex-col items-center gap-4">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300"
            style={{ backgroundColor: selectedColorValue }}
          >
            <SelectedIconComponent className="h-12 w-12 text-background" />
          </div>
          <p className="text-muted-foreground text-xs">アイコンと色を選択</p>
        </div>

        <div className="space-y-2">
          <label className="font-medium text-muted-foreground text-sm uppercase tracking-wide" htmlFor="habit-name">
            習慣の名前
          </label>
          <input
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground transition-all placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50"
            id="habit-name"
            onChange={(event) => setHabitName(event.target.value)}
            placeholder="例: 毎日水を8杯飲む"
            style={{ '--tw-ring-color': selectedColorValue } as CSSProperties}
            type="text"
            value={habitName}
          />
        </div>

        <div className="space-y-3">
          <p className="font-medium text-muted-foreground text-sm uppercase tracking-wide">アイコン</p>
          <div className="grid grid-cols-6 gap-3">
            {habitIcons.map((item) => {
              const IconComponent = item.icon
              const isSelected = selectedIcon === item.id
              return (
                <Button
                  className={cn(
                    'h-12 w-12 rounded-xl transition-all duration-200',
                    isSelected ? 'ring-2 ring-offset-2 ring-offset-background' : 'bg-card hover:bg-card/80'
                  )}
                  key={item.id}
                  onClick={() => setSelectedIcon(item.id)}
                  size="icon"
                  style={
                    {
                      backgroundColor: isSelected ? selectedColorValue : undefined,
                      '--tw-ring-color': selectedColorValue,
                    } as CSSProperties
                  }
                  type="button"
                  variant="ghost"
                >
                  <IconComponent
                    className={cn(
                      'h-6 w-6 transition-colors',
                      isSelected ? 'text-background' : 'text-muted-foreground'
                    )}
                  />
                </Button>
              )
            })}
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-medium text-muted-foreground text-sm uppercase tracking-wide">タスクの種類</p>
          <div className="grid grid-cols-3 gap-2">
            {taskPeriods.map((period) => {
              const isSelected = selectedPeriod === period.id
              return (
                <Button
                  className={cn(
                    'relative h-auto flex-col gap-1 rounded-xl border px-3 py-4 transition-all duration-200',
                    isSelected ? 'border-transparent' : 'border-border bg-card hover:bg-card/80'
                  )}
                  key={period.id}
                  onClick={() => setSelectedPeriod(period.id)}
                  style={{
                    backgroundColor: isSelected ? `${selectedColorValue}20` : undefined,
                    borderColor: isSelected ? selectedColorValue : undefined,
                  }}
                  type="button"
                  variant="ghost"
                >
                  <span
                    className={cn(
                      'font-semibold text-base transition-colors',
                      isSelected ? 'text-foreground' : 'text-muted-foreground'
                    )}
                    style={{ color: isSelected ? selectedColorValue : undefined }}
                  >
                    {period.label}
                  </span>
                  <span className="text-muted-foreground text-xs">{period.sublabel}</span>
                  {isSelected && (
                    <div
                      className="absolute top-2 right-2 h-2 w-2 rounded-full"
                      style={{ backgroundColor: selectedColorValue }}
                    />
                  )}
                </Button>
              )
            })}
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-medium text-muted-foreground text-sm uppercase tracking-wide">カラー</p>
          <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-2">
            {habitColors.map((color) => {
              const isSelected = selectedColor === color.id
              return (
                <Button
                  className={cn(
                    'h-10 w-10 flex-shrink-0 rounded-full transition-all duration-200',
                    isSelected && 'ring-2 ring-offset-2 ring-offset-background'
                  )}
                  key={color.id}
                  onClick={() => setSelectedColor(color.id)}
                  size="icon"
                  style={
                    {
                      backgroundColor: color.color,
                      '--tw-ring-color': color.color,
                    } as CSSProperties
                  }
                  type="button"
                  variant="ghost"
                >
                  {isSelected && <Check className="mx-auto h-5 w-5 text-background" />}
                </Button>
              )
            })}
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-medium text-muted-foreground text-sm uppercase tracking-wide">目標回数</p>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <Button
                className="h-10 w-10 shrink-0 rounded-full p-0"
                onClick={() => setFrequency((current) => Math.max(1, current - 1))}
                type="button"
                variant="secondary"
              >
                <span className="font-medium text-xl">−</span>
              </Button>
              <div className="flex flex-col items-center">
                <span className="font-bold text-4xl" style={{ color: selectedColorValue }}>
                  {frequency}
                </span>
                <span className="text-muted-foreground text-sm">{currentPeriod.frequencyLabel}</span>
              </div>
              <Button
                className="h-10 w-10 shrink-0 rounded-full p-0"
                onClick={() => setFrequency((current) => Math.min(99, current + 1))}
                type="button"
                variant="secondary"
              >
                <span className="font-medium text-xl">+</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-medium text-muted-foreground text-sm uppercase tracking-wide">リマインダー</p>
          <Button
            className="h-auto w-full justify-between rounded-xl border border-border bg-card p-4 hover:bg-card/80"
            type="button"
            variant="ghost"
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: `${selectedColorValue}20` }}
              >
                <Clock className="h-5 w-5" style={{ color: selectedColorValue }} />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">通知を設定</p>
                <p className="text-muted-foreground text-sm">{currentPeriod.sublabel}同じ時間にリマインド</p>
              </div>
            </div>
            <ChevronLeft className="h-5 w-5 rotate-180 text-muted-foreground" />
          </Button>
        </div>

        <div className="space-y-3">
          <p className="font-medium text-muted-foreground text-sm uppercase tracking-wide">プレビュー</p>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: selectedColorValue }}
              >
                <SelectedIconComponent className="h-7 w-7 text-background" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-lg">{habitName || '習慣の名前'}</h3>
                <p className="text-muted-foreground text-sm">
                  {frequency}
                  {currentPeriod.frequencyLabel}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <div className="font-bold text-2xl" style={{ color: selectedColorValue }}>
                  0
                </div>
                <span className="text-muted-foreground text-xs">日連続</span>
              </div>
            </div>
            <div className="mt-4 border-border border-t pt-4">
              <div className="mb-2 flex justify-between text-muted-foreground text-xs">
                <span>今日の進捗</span>
                <span>0 / {frequency}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full" style={{ width: '0%', backgroundColor: selectedColorValue }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
