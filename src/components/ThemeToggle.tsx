'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div aria-hidden="true" className="h-10 w-10 animate-pulse rounded-full bg-secondary" />
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <div className="group relative">
      <div className="absolute right-0 bottom-full mb-2 hidden w-64 group-hover:block">
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
            </div>
          </CardContent>
        </Card>
      </div>

      <Button
        aria-label={`${isDark ? 'ライト' : 'ダーク'}モードに切り替え`}
        className="h-10 w-10 rounded-full p-0"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        size="icon"
        variant="secondary"
      >
        {isDark ? <Sun className="h-[20px] w-[20px]" /> : <Moon className="h-[20px] w-[20px]" />}
      </Button>
    </div>
  )
}
