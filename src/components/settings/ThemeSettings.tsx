'use client'

import { ColorPalette } from '@/components/streak/ColorPalette'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useColorTheme } from '@/hooks/use-color-theme'

export function ThemeSettings() {
  const { theme, setTheme, ready } = useColorTheme()

  return (
    <Card>
      <CardHeader>
        <CardTitle>テーマカラー</CardTitle>
        <CardDescription>アプリのアクセントカラーを変更します。</CardDescription>
      </CardHeader>
      <CardContent>
        {ready ? (
          <ColorPalette currentTheme={theme} onThemeChange={setTheme} />
        ) : (
          <div className="h-8 w-44 rounded-full bg-muted" />
        )}
      </CardContent>
    </Card>
  )
}
