'use client'

import { valibotResolver } from '@hookform/resolvers/valibot'
import { Result } from '@praha/byethrow'
import { Check, ChevronLeft, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Resolver } from 'react-hook-form'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { createHabit } from '@/app/actions/habits/create'
import {
  DEFAULT_HABIT_COLOR,
  DEFAULT_HABIT_ICON,
  DEFAULT_HABIT_PERIOD,
  type Period,
} from '@/constants/habit'
import { getColorById, getIconById, getPeriodById, habitColors, habitIcons, taskPeriods } from '@/constants/habit-data'
import { formatSerializableError } from '@/lib/errors/serializable'
import { cn } from '@/lib/utils'
import { HabitInputSchema, type HabitInputSchemaType } from '@/schemas/habit'
import { buildHabitFormData, getHabitFormDefaults, type HabitFormValues } from '@/transforms/habitFormData'
import type { HabitWithProgress } from '@/types/habit'

interface HabitFormServerProps {
  initialData?: HabitWithProgress
  onSubmit?: (data: FormValues) => Promise<void> | void
  onSuccess?: 'close' | 'redirect'
  submitLabel?: string
}

type FormValues = Omit<HabitInputSchemaType, 'period'> & {
  period: Period
}

export function HabitFormServer({
  initialData,
  onSubmit,
  onSuccess = 'redirect',
  submitLabel = '保存',
}: HabitFormServerProps = {}) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // 初期値を設定
  const defaultValues: HabitFormValues = getHabitFormDefaults(initialData)

  const form = useForm<FormValues>({
    resolver: valibotResolver(HabitInputSchema) as Resolver<FormValues>,
    defaultValues,
  })

  // 初期値がセットされた後に初期ロードフラグを解除
  useEffect(() => {
    if (isInitialLoad) {
      form.reset(defaultValues)
      setIsInitialLoad(false)
    }
  }, [isInitialLoad, form, defaultValues])

  const watchedIcon = form.watch('icon')
  const watchedColor = form.watch('color')
  const watchedPeriod = form.watch('period')
  const watchedFrequency = form.watch('frequency')
  const watchedName = form.watch('name')

  const isDaily = watchedPeriod === 'daily'
  const selectedColorValue = getColorById(watchedColor || DEFAULT_HABIT_COLOR).color
  const SelectedIconComponent = getIconById(watchedIcon || DEFAULT_HABIT_ICON).icon
  const currentPeriod = getPeriodById(watchedPeriod || DEFAULT_HABIT_PERIOD)

  useEffect(() => {
    if (isDaily && watchedFrequency !== 1) {
      form.setValue('frequency', 1, { shouldDirty: true, shouldValidate: true })
    }
  }, [form, isDaily, watchedFrequency])

  async function handleExternalSubmit(data: FormValues) {
    if (!onSubmit) {
      return
    }
    setIsSaving(true)
    try {
      await onSubmit(data)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDefaultSubmit(data: FormValues) {
    setIsSaving(true)

    const formData = buildHabitFormData(data)
    const result = await createHabit(formData)

    setIsSaving(false)

    if (Result.isSuccess(result)) {
      toast.success(initialData ? '習慣を更新しました' : '習慣を作成しました', {
        description: initialData ? `「${data.name}」を更新しました` : `「${data.name}」が追加されました`,
      })
      form.reset()

      if (onSuccess === 'close') {
        router.back()
      } else {
        router.push('/dashboard')
      }
    } else {
      toast.error(initialData ? '習慣の更新に失敗しました' : '習慣の作成に失敗しました', {
        description: formatSerializableError(result.error),
      })
    }
  }

  async function handleSubmit(data: FormValues) {
    if (onSubmit) {
      await handleExternalSubmit(data)
    } else {
      await handleDefaultSubmit(data)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-border border-b bg-background/80 px-4 py-3 backdrop-blur-xl">
        <button
          className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => router.back()}
          type="button"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm">戻る</span>
        </button>
        <h1 className="font-semibold text-foreground text-lg">新しい習慣</h1>
        <button
          className={cn(
            'font-medium text-sm transition-colors',
            watchedName?.trim() && !isSaving
              ? 'text-foreground hover:opacity-80'
              : 'cursor-not-allowed text-muted-foreground'
          )}
          disabled={!watchedName?.trim() || isSaving}
          onClick={form.handleSubmit(handleSubmit)}
          style={{ color: watchedName?.trim() && !isSaving ? selectedColorValue : undefined }}
          type="button"
        >
          {isSaving ? <Check className="h-5 w-5" /> : submitLabel}
        </button>
      </header>

      <form className="space-y-8 px-4 py-6" onSubmit={form.handleSubmit(handleSubmit)}>
        {/* Icon Preview */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300"
            style={{ backgroundColor: selectedColorValue }}
          >
            <SelectedIconComponent className="h-12 w-12 text-background" />
          </div>
          <p className="text-muted-foreground text-xs">アイコンと色を選択</p>
        </div>

        {/* Habit Name Input */}
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <div className="font-medium text-muted-foreground text-sm uppercase tracking-wide">習慣の名前</div>
              <input
                {...field}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground transition-all placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50"
                placeholder="例: 毎日水を8杯飲む"
                style={{ '--tw-ring-color': selectedColorValue } as React.CSSProperties}
                type="text"
              />
              {fieldState.error && <p className="text-destructive text-sm">{fieldState.error.message}</p>}
            </div>
          )}
        />

        {/* Icon Selection */}
        <Controller
          control={form.control}
          name="icon"
          render={({ field }) => (
            <div className="space-y-3">
              <div className="font-medium text-muted-foreground text-sm uppercase tracking-wide">アイコン</div>
              <div className="grid grid-cols-6 gap-3">
                {habitIcons.map((item) => {
                  const IconComponent = item.icon
                  const isSelected = field.value === item.id
                  return (
                    <button
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200',
                        isSelected ? 'ring-2 ring-offset-2 ring-offset-background' : 'bg-card hover:bg-card/80'
                      )}
                      key={item.id}
                      onClick={() => field.onChange(item.id)}
                      style={
                        {
                          backgroundColor: isSelected ? selectedColorValue : undefined,
                          '--tw-ring-color': selectedColorValue,
                        } as React.CSSProperties
                      }
                      type="button"
                    >
                      <IconComponent
                        className={cn(
                          'h-6 w-6 transition-colors',
                          isSelected ? 'text-background' : 'text-muted-foreground'
                        )}
                      />
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        />

        {/* Task Period Selection */}
        <Controller
          control={form.control}
          name="period"
          render={({ field }) => (
            <div className="space-y-3">
              <div className="font-medium text-muted-foreground text-sm uppercase tracking-wide">タスクの種類</div>
              <div className="grid grid-cols-3 gap-2">
                {taskPeriods.map((period) => {
                  const isSelected = field.value === period.id
                  return (
                    <button
                      className={cn(
                        'relative flex flex-col items-center gap-1 rounded-xl border px-3 py-4 transition-all duration-200',
                        isSelected ? 'border-transparent' : 'border-border bg-card hover:bg-card/80'
                      )}
                      key={period.id}
                      onClick={() => field.onChange(period.id)}
                      style={{
                        backgroundColor: isSelected ? `${selectedColorValue}20` : undefined,
                        borderColor: isSelected ? selectedColorValue : undefined,
                      }}
                      type="button"
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
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        />

        {/* Color Selection */}
        <Controller
          control={form.control}
          name="color"
          render={({ field }) => (
            <div className="space-y-3">
              <div className="font-medium text-muted-foreground text-sm uppercase tracking-wide">カラー</div>
              <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-2">
                {habitColors.map((color) => {
                  const isSelected = field.value === color.id
                  return (
                    <button
                      className={cn(
                        'h-10 w-10 flex-shrink-0 rounded-full transition-all duration-200',
                        isSelected && 'ring-2 ring-offset-2 ring-offset-background'
                      )}
                      key={color.id}
                      onClick={() => field.onChange(color.id)}
                      style={
                        {
                          backgroundColor: color.color,
                          '--tw-ring-color': color.color,
                        } as React.CSSProperties
                      }
                      type="button"
                    >
                      {isSelected && <Check className="mx-auto h-5 w-5 text-background" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        />

        {/* Frequency */}
        <Controller
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <div className="space-y-3">
              <div className="font-medium text-muted-foreground text-sm uppercase tracking-wide">目標回数</div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isDaily}
                    onClick={() => field.onChange(Math.max(1, field.value - 1))}
                    type="button"
                  >
                    <span className="font-medium text-xl">−</span>
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="font-bold text-4xl" style={{ color: selectedColorValue }}>
                      {field.value}
                    </span>
                    <span className="text-muted-foreground text-sm">{currentPeriod.frequencyLabel}</span>
                  </div>
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isDaily}
                    onClick={() => field.onChange(field.value + 1)}
                    type="button"
                  >
                    <span className="font-medium text-xl">+</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        />

        {/* Reminder Section (Future Feature) */}
        <div className="space-y-3">
          <div className="font-medium text-muted-foreground text-sm uppercase tracking-wide">リマインダー</div>
          <button
            className="flex w-full cursor-not-allowed items-center justify-between rounded-xl border border-border bg-card p-4 opacity-50 transition-colors hover:bg-card/80"
            disabled
            type="button"
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
          </button>
        </div>

        {/* Preview Card */}
        <div className="space-y-3">
          <div className="font-medium text-muted-foreground text-sm uppercase tracking-wide">プレビュー</div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: selectedColorValue }}
              >
                <SelectedIconComponent className="h-7 w-7 text-background" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-lg">{watchedName || '習慣の名前'}</h3>
                <p className="text-muted-foreground text-sm">
                  {watchedFrequency}
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
                <span>0 / {watchedFrequency}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: '0%',
                    backgroundColor: selectedColorValue,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
