'use client'

import { Button } from '@/components/basics/Button'
import type { ColorThemeName } from '@/constants/theme'
import { cn } from '@/lib/utils'

interface ColorPaletteProps {
  currentTheme: ColorThemeName
  onThemeChange: (theme: ColorThemeName) => void
}

const colors: { name: ColorThemeName; bg: string }[] = [
  { name: 'lime', bg: 'var(--lime-10)' },
  { name: 'orange', bg: 'var(--orange-10)' },
  { name: 'red', bg: 'var(--red-10)' },
  { name: 'pink', bg: 'var(--pink-10)' },
  { name: 'purple', bg: 'var(--purple-10)' },
  { name: 'blue', bg: 'var(--blue-10)' },
  { name: 'cyan', bg: 'var(--cyan-10)' },
  { name: 'yellow', bg: 'var(--yellow-10)' },
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
