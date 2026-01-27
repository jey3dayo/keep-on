'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { ColorPalette } from '@/components/streak/ColorPalette'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DEFAULT_THEME_MODE } from '@/constants/theme'
import { useColorTheme } from '@/hooks/use-color-theme'

export function ThemeSettings() {
  const { theme: mode, setTheme: setMode } = useTheme()
  const { theme: colorTheme, setTheme: setColorTheme, ready } = useColorTheme()
  const [mounted, setMounted] = useState<boolean>(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentMode = mounted ? (mode ?? DEFAULT_THEME_MODE) : DEFAULT_THEME_MODE

  return (
    <Card>
      <CardHeader>
        <CardTitle>テーマ設定</CardTitle>
        <CardDescription>ダークモードとアクセントカラーを変更します。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="font-medium text-foreground">表示モード</p>
          <Tabs onValueChange={(value) => setMode(value)} value={currentMode}>
            <TabsList className="w-full">
              <TabsTrigger className="flex-1" value="light">
                ライト
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="dark">
                ダーク
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="system">
                システム
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="space-y-2">
          <p className="font-medium text-foreground">アクセントカラー</p>
          {ready ? (
            <ColorPalette currentTheme={colorTheme} onThemeChange={setColorTheme} />
          ) : (
            <div className="h-8 w-44 rounded-full bg-muted" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
