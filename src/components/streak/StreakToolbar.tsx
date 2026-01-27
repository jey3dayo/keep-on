'use client'

import { Icon } from '@/components/Icon'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import type { ColorThemeName } from '@/constants/theme'
import { cn } from '@/lib/utils'
import { ColorPalette } from './ColorPalette'

interface StreakToolbarProps {
  currentTheme: ColorThemeName
  onThemeChange: (theme: ColorThemeName) => void
  ready: boolean
}

const tabBaseClass =
  'flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white/75 transition-colors'

export function StreakToolbar({ currentTheme, onThemeChange, ready }: StreakToolbarProps) {
  return (
    <div className="fixed right-0 bottom-0 left-0 border-white/20 border-t bg-black/10 p-3 backdrop-blur-sm">
      <div className="mx-auto max-w-md">
        <Drawer>
          <DrawerTrigger asChild>
            <Button className={cn(tabBaseClass, 'w-full hover:bg-white/10')} suppressHydrationWarning variant="ghost">
              <Icon className="h-4 w-4" name="settings" />
              設定
            </Button>
          </DrawerTrigger>
          <DrawerContent className="pb-6">
            <DrawerHeader>
              <DrawerTitle>設定</DrawerTitle>
              <DrawerDescription>テーマカラーを選択</DrawerDescription>
            </DrawerHeader>
            <div className="px-4">
              {ready ? (
                <ColorPalette currentTheme={currentTheme} onThemeChange={onThemeChange} />
              ) : (
                <div className="h-8 w-44 rounded-full bg-muted" />
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  )
}
