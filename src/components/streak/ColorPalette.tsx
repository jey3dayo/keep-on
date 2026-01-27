'use client'

import type { ColorThemeName } from '@/constants/theme'
import { cn } from '@/lib/utils'

interface ColorPaletteProps {
  currentTheme: ColorThemeName
  onThemeChange: (theme: ColorThemeName) => void
}

const colors: { name: ColorThemeName; bg: string }[] = [
  { name: 'lime', bg: 'oklch(0.64 0.19 128)' },
  { name: 'orange', bg: 'oklch(0.68 0.21 48)' },
  { name: 'red', bg: 'oklch(0.61 0.225 25)' },
  { name: 'pink', bg: 'oklch(0.64 0.25 355)' },
  { name: 'purple', bg: 'oklch(0.53 0.23 305)' },
  { name: 'blue', bg: 'oklch(0.62 0.2 250)' },
  { name: 'cyan', bg: 'oklch(0.62 0.13 215)' },
  { name: 'yellow', bg: 'oklch(0.81 0.175 80)' },
]

export function ColorPalette({ currentTheme, onThemeChange }: ColorPaletteProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {colors.map(({ name, bg }) => (
        <button
          aria-label={`${name} テーマ`}
          aria-pressed={currentTheme === name}
          className={cn('color-swatch', currentTheme === name && 'color-swatch-selected')}
          key={name}
          onClick={() => onThemeChange(name)}
          style={{ backgroundColor: bg }}
          type="button"
        />
      ))}
    </div>
  )
}
