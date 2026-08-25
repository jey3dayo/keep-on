'use client'

import { useCallback } from 'react'
import { Button } from '@/components/basics/Button'
import type { ColorThemeName } from '@/constants/theme'
import { cn } from '@/lib/utils'

export interface ColorPaletteProps {
  currentTheme: ColorThemeName
  onThemeChange: (theme: ColorThemeName) => void
}

const colors: { name: ColorThemeName; bg: string }[] = [
  { bg: 'var(--teal-10)', name: 'teal' },
  { bg: 'var(--lime-10)', name: 'lime' },
  { bg: 'var(--orange-10)', name: 'orange' },
  { bg: 'var(--red-10)', name: 'red' },
  { bg: 'var(--pink-10)', name: 'pink' },
  { bg: 'var(--purple-10)', name: 'purple' },
  { bg: 'var(--blue-10)', name: 'blue' },
  { bg: 'var(--cyan-10)', name: 'cyan' },
  { bg: 'var(--yellow-10)', name: 'yellow' },
]

export function ColorPalette({ currentTheme, onThemeChange }: ColorPaletteProps) {
  const handleThemeChange = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const theme = event.currentTarget.dataset.theme
      const color = colors.find((candidate) => candidate.name === theme)
      if (color) {
        onThemeChange(color.name)
      }
    },
    [onThemeChange]
  )
  return (
    // gap-3(12px): スウォッチ(32px)を ::after で 44px(inset-1.5=6px×2) に広げても隣接分と重ならない間隔
    <div className="flex items-center justify-center gap-3">
      {colors.map(({ name, bg }) => (
        <Button
          aria-label={`${name} テーマ`}
          aria-pressed={currentTheme === name}
          // .color-swatch は globals.css の @layer base 外で w-8 h-8 を強制するため、
          // 見た目の寸法はそのまま、::after のエキスパンダで当たり判定だけ 44px に広げる
          className={cn(
            "color-swatch relative after:absolute after:-inset-1.5 after:content-[''] hover:bg-transparent",
            currentTheme === name && 'color-swatch-selected'
          )}
          data-theme={name}
          key={name}
          onClick={handleThemeChange}
          size="icon"
          style={{ backgroundColor: bg }}
          type="button"
          variant="ghost"
        />
      ))}
    </div>
  )
}
