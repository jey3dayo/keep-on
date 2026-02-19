import type { FC } from 'react'

interface HabitPreviewCardProps {
  currentPeriodFrequencyLabel: string
  SelectedIconComponent: FC<{ className?: string }>
  selectedColorValue: string
  watchedFrequency: number
  watchedName: string | undefined
}

export function HabitPreviewCard({
  SelectedIconComponent,
  currentPeriodFrequencyLabel,
  selectedColorValue,
  watchedFrequency,
  watchedName,
}: HabitPreviewCardProps) {
  return (
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
              {currentPeriodFrequencyLabel}
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
  )
}
