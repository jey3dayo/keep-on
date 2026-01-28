'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DEFAULT_THEME_MODE } from '@/constants/theme'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  buttonVariant?: ButtonProps['variant']
  buttonClassName?: string
}

export function ThemeToggle({ buttonVariant = 'secondary', buttonClassName }: ThemeToggleProps) {
  const { resolvedTheme, setTheme, theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className={cn('h-9 w-9 animate-pulse rounded-full border border-border/40 bg-transparent')}
      />
    )
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
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`${currentLabel}モード中`}
            className={cn('rounded-full bg-transparent p-0 hover:bg-white/10 dark:hover:bg-white/5', buttonClassName)}
            size="icon"
            variant={buttonVariant}
          >
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
