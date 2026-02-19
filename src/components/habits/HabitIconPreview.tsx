import type { FC } from 'react'

interface HabitIconPreviewProps {
  backgroundColor: string
  IconComponent: FC<{ className?: string }>
}

export function HabitIconPreview({ IconComponent, backgroundColor }: HabitIconPreviewProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300"
        style={{ backgroundColor }}
      >
        <IconComponent className="h-12 w-12 text-background" />
      </div>
      <p className="text-muted-foreground text-xs">アイコンと色を選択</p>
    </div>
  )
}
