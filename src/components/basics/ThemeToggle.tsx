'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DEFAULT_THEME_MODE } from '@/constants/theme'

export function ThemeToggle() {
  const { resolvedTheme, setTheme, theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div aria-hidden="true" className="h-9 w-9 animate-pulse rounded-full bg-secondary" />
  }

  const isDark = resolvedTheme === 'dark'
  const currentMode = theme ?? DEFAULT_THEME_MODE
  let currentLabel = 'ライト'
  let CurrentIcon = Sun

  if (currentMode === 'system') {
    currentLabel = 'システム'
    CurrentIcon = Monitor
  } else if (isDark) {
    currentLabel = 'ダーク'
    CurrentIcon = Moon
  }

  return (
    <div className="group relative">
      <div className="absolute top-full right-0 z-50 mt-2 hidden w-64 group-hover:block">
        <Card className="border-border bg-popover shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">テーマ切り替え</CardTitle>
            <CardDescription className="text-xs">見た目のスタイルを選択できます</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Sun className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">ライトモード</p>
                  <p className="text-muted-foreground text-xs">明るい配色</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Moon className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">ダークモード</p>
                  <p className="text-muted-foreground text-xs">暗い配色</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Monitor className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">システム</p>
                  <p className="text-muted-foreground text-xs">端末設定に合わせる</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label={`${currentLabel}モード中`} className="rounded-full p-0" size="icon" variant="secondary">
            <CurrentIcon className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup onValueChange={setTheme} value={currentMode}>
            <DropdownMenuRadioItem value="light">
              <Sun className="h-4 w-4" />
              ライト
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon className="h-4 w-4" />
              ダーク
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <Monitor className="h-4 w-4" />
              システム
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
