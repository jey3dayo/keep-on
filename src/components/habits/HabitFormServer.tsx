'use client'

import { valibotResolver } from '@hookform/resolvers/valibot'
import { Check, ChevronLeft, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { Resolver } from 'react-hook-form'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { createHabit } from '@/app/actions/habits/create'
import { updateHabitAction } from '@/app/actions/habits/update'
import { Button } from '@/components/basics/Button'
import { HabitIconPreview } from '@/components/habits/HabitIconPreview'
import { HabitPreviewCard } from '@/components/habits/HabitPreviewCard'
import { DEFAULT_HABIT_COLOR, DEFAULT_HABIT_ICON, DEFAULT_HABIT_PERIOD } from '@/constants/habit'
import {
  getColorById,
  getIconById,
  getPeriodById,
  type HabitPreset,
  habitColors,
  habitIcons,
  taskPeriods,
} from '@/constants/habit-data'
import { formatSerializableError } from '@/lib/errors/serializable'
import { cn } from '@/lib/utils'
import { HabitInputSchema } from '@/schemas/habit'
import { buildHabitFormData, getHabitFormDefaults, type HabitFormValues } from '@/transforms/habitFormData'
import type { Habit, HabitWithProgress } from '@/types/habit'

interface HabitFormServerProps {
  hideHeader?: boolean
  initialData?: Habit | HabitWithProgress | HabitPreset
  onSubmit?: (data: FormValues) => Promise<void> | void
  onSuccess?: 'close' | 'redirect'
  submitLabel?: string
}

type FormValues = HabitFormValues

export function HabitFormServer({
  initialData,
  onSubmit,
  onSuccess = 'redirect',
  submitLabel = '保存',
  hideHeader = false,
}: HabitFormServerProps = {}) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  // 初期値を設定（メモ化して不要な再計算を防ぐ）
  const defaultValues: HabitFormValues = useMemo(() => getHabitFormDefaults(initialData), [initialData])

  // 編集モードかどうかを判定（HabitPresetの場合は新規作成扱い）
  const isEdit = useMemo(() => Boolean(initialData && !('category' in initialData)), [initialData])

  const form = useForm<FormValues>({
    resolver: valibotResolver(HabitInputSchema) as Resolver<FormValues>,
    defaultValues,
  })

  // initialData が変わった場合にフォームをリセット
  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  const watchedIcon = form.watch('icon')
  const watchedColor = form.watch('color')
  const watchedPeriod = form.watch('period')
  const watchedFrequency = form.watch('frequency')
  const watchedName = form.watch('name')

  const selectedColorValue = getColorById(watchedColor || DEFAULT_HABIT_COLOR).color
  const selectedColorForeground = getColorById(watchedColor || DEFAULT_HABIT_COLOR).foreground
  const SelectedIconComponent = getIconById(watchedIcon || DEFAULT_HABIT_ICON).icon
  const currentPeriod = getPeriodById(watchedPeriod || DEFAULT_HABIT_PERIOD)
  const submitContent = isSaving ? <Check className="h-5 w-5" /> : submitLabel

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
    // HabitPresetの場合は新規作成、既存のHabitの場合は更新
    const result = isEdit
      ? await updateHabitAction((initialData as Habit | HabitWithProgress).id, formData)
      : await createHabit(formData)

    setIsSaving(false)

    if (result.ok) {
      toast.success(isEdit ? '習慣を更新しました' : '習慣を作成しました', {
        description: isEdit ? `「${data.name}」を更新しました` : `「${data.name}」が追加されました`,
      })
      form.reset()

      if (onSuccess === 'close') {
        router.back()
      } else {
        router.push('/dashboard')
      }
    } else {
      toast.error(isEdit ? '習慣の更新に失敗しました' : '習慣の作成に失敗しました', {
        description: formatSerializableError(result.error),
      })
    }
  }

  async function handleSubmit(data: FormValues) {
    if (onSubmit) {
      await handleExternalSubmit(data)
      return
    }
    await handleDefaultSubmit(data)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {!hideHeader && (
        <header className="sticky top-0 z-10 flex items-center justify-between border-border/50 border-b bg-background/50 px-4 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/30">
          <Button
            className="h-auto gap-1 p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
            onClick={() => router.back()}
            type="button"
            variant="ghost"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm">戻る</span>
          </Button>
          <h1 className="font-semibold text-foreground text-lg">{isEdit ? '習慣を編集' : '新しい習慣'}</h1>
          <Button
            className={cn(
              'h-auto p-0 hover:bg-transparent',
              watchedName?.trim() && !isSaving
                ? 'text-foreground hover:opacity-80'
                : 'cursor-not-allowed text-muted-foreground'
            )}
            disabled={!watchedName?.trim() || isSaving}
            onClick={form.handleSubmit(handleSubmit)}
            style={{ color: watchedName?.trim() && !isSaving ? selectedColorValue : undefined }}
            type="button"
            variant="ghost"
          >
            {submitContent}
          </Button>
        </header>
      )}

      <form
        className={hideHeader ? 'space-y-8 px-4 py-2' : 'space-y-8 px-4 py-6'}
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        {/* Icon Preview */}
        <HabitIconPreview backgroundColor={selectedColorValue} IconComponent={SelectedIconComponent} />

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
                    <Button
                      className={cn(
                        'h-12 w-12 rounded-xl transition-all duration-200',
                        isSelected ? 'ring-2 ring-offset-2 ring-offset-background' : 'bg-card hover:bg-card/80'
                      )}
                      key={item.id}
                      onClick={() => field.onChange(item.id)}
                      size="icon"
                      style={
                        {
                          backgroundColor: isSelected ? selectedColorValue : undefined,
                          '--tw-ring-color': selectedColorValue,
                        } as React.CSSProperties
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
          )}
        />

        {/* Task Period Selection */}
        <Controller
          control={form.control}
          name="period"
          render={({ field }) => (
            <div className="space-y-3">
              <div className="font-medium text-muted-foreground text-sm uppercase tracking-wide">頻度</div>
              <div className="grid grid-cols-3 gap-2">
                {taskPeriods.map((period) => {
                  const isSelected = field.value === period.id
                  return (
                    <Button
                      className={cn(
                        'relative h-auto flex-col gap-1 rounded-xl border px-3 py-4 transition-all duration-200',
                        isSelected ? 'border-transparent' : 'border-border bg-card hover:bg-card/80'
                      )}
                      key={period.id}
                      onClick={() => field.onChange(period.id)}
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
          )}
        />

        {/* Color Selection */}
        <Controller
          control={form.control}
          name="color"
          render={({ field }) => (
            <div className="space-y-3">
              <div className="font-medium text-muted-foreground text-sm uppercase tracking-wide">カラー</div>
              <div className="scrollbar-hide flex gap-3 overflow-x-auto px-1 pt-1 pb-2">
                {habitColors.map((color) => {
                  const isSelected = field.value === color.id
                  return (
                    <Button
                      className={cn(
                        'h-10 w-10 flex-shrink-0 rounded-full transition-all duration-200',
                        isSelected && 'ring-2 ring-offset-background'
                      )}
                      key={color.id}
                      onClick={() => field.onChange(color.id)}
                      size="icon"
                      style={
                        {
                          backgroundColor: color.color,
                          '--tw-ring-color': color.color,
                        } as React.CSSProperties
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
                  <Button
                    className="h-10 w-10 rounded-full p-0"
                    onClick={() => field.onChange(Math.max(1, field.value - 1))}
                    size="icon"
                    type="button"
                    variant="secondary"
                  >
                    <span className="font-medium text-xl">−</span>
                  </Button>
                  <div className="flex flex-col items-center">
                    <span className="font-bold text-4xl" style={{ color: selectedColorValue }}>
                      {field.value}
                    </span>
                    <span className="text-muted-foreground text-sm">{currentPeriod.frequencyLabel}</span>
                  </div>
                  <Button
                    className="h-10 w-10 rounded-full p-0"
                    onClick={() => field.onChange(field.value + 1)}
                    size="icon"
                    type="button"
                    variant="secondary"
                  >
                    <span className="font-medium text-xl">+</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        />

        {/* Reminder Section */}
        <Controller
          control={form.control}
          name="reminderTime"
          render={({ field }) => (
            <div className="space-y-3">
              <div className="font-medium text-muted-foreground text-sm uppercase tracking-wide">リマインダー</div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${selectedColorValue}20` }}
                  >
                    <Clock className="h-5 w-5" style={{ color: selectedColorValue }} />
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-3">
                    <div className="text-left">
                      <p className="font-medium text-foreground">通知時刻</p>
                      <p className="text-muted-foreground text-sm">未設定の場合はリマインドなし</p>
                    </div>
                    <input
                      className="rounded-lg border border-border bg-background px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                      onChange={(e) => field.onChange(e.target.value || null)}
                      style={{ '--tw-ring-color': selectedColorValue } as React.CSSProperties}
                      type="time"
                      value={field.value ?? ''}
                    />
                  </div>
                </div>
                {field.value && (
                  <button
                    className="mt-3 w-full text-center text-muted-foreground text-sm hover:text-foreground"
                    onClick={() => field.onChange(null)}
                    type="button"
                  >
                    リマインダーを解除
                  </button>
                )}
              </div>
            </div>
          )}
        />

        {/* Preview Card */}
        <HabitPreviewCard
          currentPeriodFrequencyLabel={currentPeriod.frequencyLabel}
          SelectedIconComponent={SelectedIconComponent}
          selectedColorValue={selectedColorValue}
          watchedFrequency={watchedFrequency}
          watchedName={watchedName}
        />

        {/* Submit Button for Modal */}
        {hideHeader && (
          <div className="sticky bottom-0 mt-8 bg-background pt-2 pb-4">
            <Button
              className="w-full"
              disabled={!watchedName?.trim() || isSaving}
              onClick={form.handleSubmit(handleSubmit)}
              style={{
                backgroundColor: watchedName?.trim() && !isSaving ? selectedColorValue : undefined,
                color: watchedName?.trim() && !isSaving ? selectedColorForeground : undefined,
              }}
              type="button"
            >
              {submitContent}
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}
