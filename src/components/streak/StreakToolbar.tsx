'use client'

import { Icon } from '@/components/Icon'
import type { ThemeName } from '@/hooks/use-color-theme'
import { ColorPalette } from './ColorPalette'

interface StreakToolbarProps {
  currentTheme: ThemeName
  onThemeChange: (theme: ThemeName) => void
  onSettingsClick: () => void
}

export function StreakToolbar({ currentTheme, onThemeChange, onSettingsClick }: StreakToolbarProps) {
  return (
    <div className="fixed right-0 bottom-0 left-0 border-white/20 border-t bg-black/10 p-4 backdrop-blur-sm">
      <div className="mx-auto flex max-w-md items-center justify-between">
        <button
          aria-label="設定"
          className="p-2 transition-transform active:scale-90"
          onClick={onSettingsClick}
          type="button"
        >
          <Icon className="h-6 w-6 text-white" name="settings" />
        </button>
        <ColorPalette currentTheme={currentTheme} onThemeChange={onThemeChange} />
        <div className="w-10" />
      </div>
    </div>
  )
}
