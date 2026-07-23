'use client'

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
