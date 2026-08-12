'use client'

import { valibotResolver } from '@hookform/resolvers/valibot'
import { Check, ChevronLeft, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import type { Control, Resolver } from 'react-hook-form'
import { useController, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { createHabit } from '@/app/actions/habits/create'
import { updateHabitAction } from '@/app/actions/habits/update'
import { Button } from '@/components/basics/Button'
import { Input } from '@/components/basics/Input'
import { HabitIconPreview } from '@/components/habits/HabitIconPreview'
import { HabitPreviewCard } from '@/components/habits/HabitPreviewCard'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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

interface HabitFormHeaderProps {
  isEdit: boolean
  isSaving: boolean
  onBack: () => void
  onSubmit: () => void
  selectedColorValue: string
  submitContent: React.ReactNode
  t: (key: string) => string
  watchedName?: string
}

function HabitFormHeader({
  isEdit,
  isSaving,
  onBack,
  onSubmit,
  selectedColorValue,
  submitContent,
  t,
  watchedName,
}: HabitFormHeaderProps) {
  const canSubmit = Boolean(watchedName?.trim()) && !isSaving

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-border/50 border-b bg-background/50 px-4 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/30">
      <Button
        className="h-auto gap-1 p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
        onClick={onBack}
        type="button"
        variant="ghost"
      >
        <ChevronLeft className="h-5 w-5" />
        <span className="text-sm">{t('habits.form.back')}</span>
      </Button>
      <h2 className="font-semibold text-foreground text-lg">
        {isEdit ? t('habits.form.titleEdit') : t('habits.form.titleNew')}
      </h2>
      <Button
        className={cn(
          'h-auto p-0 hover:bg-transparent',
          canSubmit ? 'text-foreground hover:opacity-80' : 'cursor-not-allowed text-muted-foreground'
        )}
        disabled={!canSubmit}
        onClick={onSubmit}
        style={{ color: canSubmit ? selectedColorValue : undefined }}
        type="button"
        variant="ghost"
      >
        {submitContent}
      </Button>
    </header>
  )
}

interface HabitFormFieldProps {
  control: Control<FormValues>
  selectedColorValue: string
  t: (key: string) => string
}

function HabitNameField({ control, selectedColorValue, t }: HabitFormFieldProps) {
  const { field, fieldState } = useController({ control, name: 'name' })
  const inputId = useId()
  const errorId = useId()

  return (
    <div className="space-y-2">
      <label className="font-medium text-muted-foreground text-sm uppercase tracking-wide" htmlFor={inputId}>
        {t('habits.form.nameLabel')}
      </label>
      <Input
        {...field}
        aria-describedby={fieldState.error ? errorId : undefined}
        aria-invalid={fieldState.error ? true : undefined}
        className="h-auto rounded-xl border-border bg-card px-4 py-3 text-foreground shadow-none transition-all placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring/50"
        error={Boolean(fieldState.error)}
        id={inputId}
        placeholder={t('habits.form.namePlaceholder')}
        required
        style={{ '--tw-ring-color': selectedColorValue } as React.CSSProperties}
        type="text"
      />
      {fieldState.error ? (
        <p className="text-destructive text-sm" id={errorId}>
          {fieldState.error.message}
        </p>
      ) : null}
    </div>
  )
}

function HabitIconField({ control, selectedColorValue, t }: HabitFormFieldProps) {
  const { field } = useController({ control, name: 'icon' })
  const headingId = useId()

  return (
    <div className="space-y-3">
      <div className="font-medium text-muted-foreground text-sm uppercase tracking-wide" id={headingId}>
        {t('habits.form.iconLabel')}
      </div>
      <RadioGroup
        aria-labelledby={headingId}
        className="grid grid-cols-6 gap-3"
        onValueChange={field.onChange}
        value={field.value}
      >
        {habitIcons.map((item) => {
          const IconComponent = item.icon
          const isSelected = field.value === item.id
          return (
            <div className="relative h-12 w-12" key={item.id}>
              {/* RadioGroupItem のビルトイン Indicator は表示できないため、実体は透明な overlay として重ね、見た目は下の div で維持する */}
              <RadioGroupItem
                aria-label={item.label}
                className="peer absolute inset-0 h-12 w-12 cursor-pointer rounded-xl border-0 text-transparent [&_svg]:hidden"
                value={item.id}
              />
              <div
                aria-hidden="true"
                className={cn(
                  'pointer-events-none flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200',
                  isSelected ? 'ring-2 ring-offset-2 ring-offset-background' : 'bg-card peer-hover:bg-card/80'
                )}
                style={
                  {
                    '--tw-ring-color': selectedColorValue,
                    backgroundColor: isSelected ? selectedColorValue : undefined,
                  } as React.CSSProperties
                }
              >
                <IconComponent
                  className={cn('h-6 w-6 transition-colors', isSelected ? 'text-background' : 'text-muted-foreground')}
                />
              </div>
            </div>
          )
        })}
      </RadioGroup>
    </div>
  )
}

function HabitPeriodField({ control, selectedColorValue, t }: HabitFormFieldProps) {
  const { field } = useController({ control, name: 'period' })
  const headingId = useId()

  return (
    <div className="space-y-3">
      <div className="font-medium text-muted-foreground text-sm uppercase tracking-wide" id={headingId}>
        {t('habits.form.periodLabel')}
      </div>
      <RadioGroup
        aria-labelledby={headingId}
        className="grid grid-cols-3 gap-2"
        onValueChange={field.onChange}
        value={field.value}
      >
        {taskPeriods.map((period) => {
          const isSelected = field.value === period.id
          const labelId = `${headingId}-${period.id}`
          return (
            <div className="relative" key={period.id}>
              {/* RadioGroupItem のビルトイン Indicator は表示できないため、実体は透明な overlay として重ね、見た目は下の div で維持する */}
              <RadioGroupItem
                aria-labelledby={labelId}
                className="peer absolute inset-0 h-full w-full cursor-pointer rounded-xl border-0 text-transparent [&_svg]:hidden"
                value={period.id}
              />
              <div
                aria-hidden="true"
                className={cn(
                  'pointer-events-none relative flex h-auto flex-col gap-1 rounded-xl border px-3 py-4 transition-all duration-200',
                  isSelected ? 'border-transparent' : 'border-border bg-card peer-hover:bg-card/80'
                )}
                style={{
                  backgroundColor: isSelected ? `${selectedColorValue}20` : undefined,
                  borderColor: isSelected ? selectedColorValue : undefined,
                }}
              >
                <span
                  className={cn(
                    'font-semibold text-base transition-colors',
                    isSelected ? 'text-foreground' : 'text-muted-foreground'
                  )}
                  id={labelId}
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
              </div>
            </div>
          )
        })}
      </RadioGroup>
    </div>
  )
}

function HabitColorField({ control, t }: HabitFormFieldProps) {
  const { field } = useController({ control, name: 'color' })
  const headingId = useId()

  return (
    <div className="space-y-3">
      <div className="font-medium text-muted-foreground text-sm uppercase tracking-wide" id={headingId}>
        {t('habits.form.colorLabel')}
      </div>
      <RadioGroup
        aria-labelledby={headingId}
        className="scrollbar-hide flex gap-3 overflow-x-auto px-1 pt-1 pb-2"
        onValueChange={field.onChange}
        value={field.value}
      >
        {habitColors.map((color) => {
          const isSelected = field.value === color.id
          return (
            <div className="relative h-10 w-10 flex-shrink-0" key={color.id}>
              {/* RadioGroupItem のビルトイン Indicator は表示できないため、実体は透明な overlay として重ね、見た目は下の div で維持する */}
              <RadioGroupItem
                aria-label={color.label}
                className="peer absolute inset-0 h-10 w-10 cursor-pointer rounded-full border-0 text-transparent [&_svg]:hidden"
                value={color.id}
              />
              <div
                aria-hidden="true"
                className={cn(
                  'pointer-events-none flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200',
                  isSelected && 'ring-2 ring-offset-background'
                )}
                style={{ '--tw-ring-color': color.color, backgroundColor: color.color } as React.CSSProperties}
              >
                {isSelected && <Check className="mx-auto h-5 w-5 text-background" />}
              </div>
            </div>
          )
        })}
      </RadioGroup>
    </div>
  )
}

interface HabitFrequencyFieldProps extends HabitFormFieldProps {
  frequencyLabel: string
}

function HabitFrequencyField({ control, selectedColorValue, t, frequencyLabel }: HabitFrequencyFieldProps) {
  const { field } = useController({ control, name: 'frequency' })
  const handleDecrease = useCallback(() => field.onChange(Math.max(1, field.value - 1)), [field])
  const handleIncrease = useCallback(() => field.onChange(field.value + 1), [field])

  return (
    <div className="space-y-3">
      <div className="font-medium text-muted-foreground text-sm uppercase tracking-wide">
        {t('habits.form.frequencyLabel')}
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <Button
            aria-label={t('habits.form.frequencyDecreaseLabel')}
            className="h-10 w-10 rounded-full p-0"
            disabled={field.value <= 1}
            onClick={handleDecrease}
            size="icon"
            type="button"
            variant="secondary"
          >
            <span className="font-medium text-xl">−</span>
          </Button>
          <div className="flex flex-col items-center">
            <span className="font-bold text-4xl tracking-tight" style={{ color: selectedColorValue }}>
              {field.value}
            </span>
            <span className="text-muted-foreground text-sm">{frequencyLabel}</span>
          </div>
          <Button
            aria-label={t('habits.form.frequencyIncreaseLabel')}
            className="h-10 w-10 rounded-full p-0"
            onClick={handleIncrease}
            size="icon"
            type="button"
            variant="secondary"
          >
            <span className="font-medium text-xl">+</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

function HabitReminderField({ control, selectedColorValue, t }: HabitFormFieldProps) {
  const { field } = useController({ control, name: 'reminderTime' })
  const titleId = useId()
  const descriptionId = useId()
  const handleReminderChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => field.onChange(event.target.value || null),
    [field]
  )
  const handleReminderClear = useCallback(() => field.onChange(null), [field])

  return (
    <div className="space-y-3">
      <div className="font-medium text-muted-foreground text-sm uppercase tracking-wide">
        {t('habits.form.reminderLabel')}
      </div>
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
              <p className="font-medium text-foreground" id={titleId}>
                {t('habits.form.reminderTitle')}
              </p>
              <p className="text-muted-foreground text-sm" id={descriptionId}>
                {t('habits.form.reminderDescription')}
              </p>
            </div>
            <input
              aria-labelledby={titleId}
              className="rounded-lg border border-border bg-background px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
              onChange={handleReminderChange}
              style={{ '--tw-ring-color': selectedColorValue } as React.CSSProperties}
              type="time"
              value={field.value ?? ''}
            />
          </div>
        </div>
        {field.value ? (
          <Button
            className="mt-3 h-auto min-h-11 w-full whitespace-normal p-0 text-center text-muted-foreground text-sm hover:bg-transparent hover:text-foreground"
            onClick={handleReminderClear}
            type="button"
            variant="ghost"
          >
            {t('habits.form.reminderClear')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function HabitFormServer({
  initialData,
  onSubmit,
  onSuccess = 'redirect',
  submitLabel,
  hideHeader = false,
}: HabitFormServerProps = {}) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const resolvedSubmitLabel = submitLabel ?? t('habits.form.save')

  // 初期値を設定（メモ化して不要な再計算を防ぐ）
  const defaultValues: HabitFormValues = useMemo(() => getHabitFormDefaults(initialData), [initialData])

  // 編集モードかどうかを判定（HabitPresetの場合は新規作成扱い）
  const isEdit = useMemo(() => Boolean(initialData && !('category' in initialData)), [initialData])

  const form = useForm<FormValues>({
    defaultValues,
    resolver: valibotResolver(HabitInputSchema) as Resolver<FormValues>,
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
  const submitContent = isSaving ? <Check className="h-5 w-5" /> : resolvedSubmitLabel

  const handleBack = useCallback(() => router.back(), [router])
  const handleDefaultSubmit = useCallback(
    async (data: FormValues) => {
      setIsSaving(true)

      const formData = buildHabitFormData(data)
      // HabitPresetの場合は新規作成、既存のHabitの場合は更新
      const result = isEdit
        ? await updateHabitAction((initialData as Habit | HabitWithProgress).id, formData)
        : await createHabit(formData)

      setIsSaving(false)

      if (result.ok) {
        toast.success(isEdit ? t('habits.form.toast.updateSuccessTitle') : t('habits.form.toast.createSuccessTitle'), {
          description: isEdit
            ? t('habits.form.toast.updateSuccessDescription', { name: data.name })
            : t('habits.form.toast.createSuccessDescription', { name: data.name }),
        })
        form.reset()

        if (onSuccess === 'close') {
          router.back()
        } else {
          router.push('/dashboard')
        }
      } else {
        toast.error(isEdit ? t('habits.form.toast.updateErrorTitle') : t('habits.form.toast.createErrorTitle'), {
          description: formatSerializableError(result.error),
        })
      }
    },
    [form, initialData, isEdit, onSuccess, router, t]
  )
  const handleSubmit = useCallback(
    async (data: FormValues) => {
      if (!onSubmit) {
        await handleDefaultSubmit(data)
        return
      }
      setIsSaving(true)
      try {
        await onSubmit(data)
      } finally {
        setIsSaving(false)
      }
    },
    [handleDefaultSubmit, onSubmit]
  )
  const handleFormSubmit = useMemo(() => form.handleSubmit(handleSubmit), [form, handleSubmit])

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      {hideHeader ? null : (
        <HabitFormHeader
          isEdit={isEdit}
          isSaving={isSaving}
          onBack={handleBack}
          onSubmit={handleFormSubmit}
          selectedColorValue={selectedColorValue}
          submitContent={submitContent}
          t={t}
          watchedName={watchedName}
        />
      )}

      <form className={hideHeader ? 'space-y-8 px-4 py-2' : 'space-y-8 px-4 py-6'} onSubmit={handleFormSubmit}>
        {/* Icon Preview */}
        <HabitIconPreview backgroundColor={selectedColorValue} IconComponent={SelectedIconComponent} />

        <HabitNameField control={form.control} selectedColorValue={selectedColorValue} t={t} />
        <HabitIconField control={form.control} selectedColorValue={selectedColorValue} t={t} />
        <HabitPeriodField control={form.control} selectedColorValue={selectedColorValue} t={t} />
        <HabitColorField control={form.control} selectedColorValue={selectedColorValue} t={t} />
        <HabitFrequencyField
          control={form.control}
          frequencyLabel={currentPeriod.frequencyLabel}
          selectedColorValue={selectedColorValue}
          t={t}
        />
        <HabitReminderField control={form.control} selectedColorValue={selectedColorValue} t={t} />

        {/* Preview Card */}
        <HabitPreviewCard
          currentPeriodFrequencyLabel={currentPeriod.frequencyLabel}
          SelectedIconComponent={SelectedIconComponent}
          selectedColorValue={selectedColorValue}
          watchedFrequency={watchedFrequency}
          watchedName={watchedName}
        />

        {/* Submit Button for Modal */}
        {/* hideHeader は RouteModal 経由でのみ true になる（フルページの /habits/new, /habits/[id]/edit では常に false）。
            safe-area の加算は RouteModal 側が一元的に持つため、ここでは通常の pb-4 に留める。 */}
        {hideHeader ? (
          <div className="sticky bottom-0 mt-8 bg-background pt-2 pb-4">
            <Button
              className="w-full"
              disabled={!watchedName?.trim() || isSaving}
              onClick={handleFormSubmit}
              style={{
                backgroundColor: watchedName?.trim() && !isSaving ? selectedColorValue : undefined,
                color: watchedName?.trim() && !isSaving ? selectedColorForeground : undefined,
              }}
              type="button"
            >
              {submitContent}
            </Button>
          </div>
        ) : null}
      </form>
    </div>
  )
}
