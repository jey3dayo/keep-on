'use client'

import { Button } from '@/components/basics/Button'
import type { ColorThemeName } from '@/constants/theme'
import { cn } from '@/lib/utils'

interface ColorPaletteProps {
  currentTheme: ColorThemeName
  onThemeChange: (theme: ColorThemeName) => void
}

const colors: { name: ColorThemeName; bg: string }[] = [
  { name: 'lime', bg: 'var(--lime-9)' },
  { name: 'orange', bg: 'var(--orange-9)' },
  { name: 'red', bg: 'var(--red-9)' },
  { name: 'pink', bg: 'var(--pink-9)' },
  { name: 'purple', bg: 'var(--purple-9)' },
  { name: 'blue', bg: 'var(--blue-9)' },
  { name: 'cyan', bg: 'var(--cyan-9)' },
  { name: 'yellow', bg: 'var(--yellow-9)' },
]

export function ColorPalette({ currentTheme, onThemeChange }: ColorPaletteProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {colors.map(({ name, bg }) => (
        <Button
          aria-label={`${name} テーマ`}
          aria-pressed={currentTheme === name}
          className={cn('color-swatch hover:bg-transparent', currentTheme === name && 'color-swatch-selected')}
          key={name}
          onClick={() => onThemeChange(name)}
          size="icon"
          style={{ backgroundColor: bg }}
          type="button"
          variant="ghost"
        />
      ))}
    </div>
  )
}
