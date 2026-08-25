'use client'

import { useTheme } from 'next-themes'
import { useCallback, useEffect, useState } from 'react'
import { ColorPalette } from '@/components/streak/ColorPalette'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type ColorThemeName, DEFAULT_THEME_MODE } from '@/constants/theme'
import { useColorTheme } from '@/hooks/use-color-theme'

const MODE_LABELS = {
  dark: 'ダーク',
  light: 'ライト',
  system: 'システム',
} as const

const COLOR_THEME_META: Record<ColorThemeName, { label: string; swatch: string }> = {
  blue: { label: 'ブルー', swatch: 'var(--blue-9)' },
  cyan: { label: 'シアン', swatch: 'var(--cyan-9)' },
  lime: { label: 'ライム', swatch: 'var(--lime-9)' },
  orange: { label: 'オレンジ', swatch: 'var(--orange-9)' },
  pink: { label: 'ピンク', swatch: 'var(--pink-9)' },
  purple: { label: 'パープル', swatch: 'var(--purple-9)' },
  red: { label: 'レッド', swatch: 'var(--red-9)' },
  teal: { label: 'ティール', swatch: 'var(--teal-9)' },
  yellow: { label: 'イエロー', swatch: 'var(--yellow-9)' },
}

export function ThemeSettings({
  className,
  initialColorTheme,
}: {
  className?: string
  initialColorTheme?: ColorThemeName
}) {
  const { theme: mode, setTheme: setMode } = useTheme()
  const { theme: colorTheme, setTheme: setColorTheme, ready } = useColorTheme(initialColorTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentMode = mounted ? (mode ?? DEFAULT_THEME_MODE) : DEFAULT_THEME_MODE
  const currentModeLabel = MODE_LABELS[currentMode as keyof typeof MODE_LABELS] ?? MODE_LABELS.system
  const currentColorMeta = COLOR_THEME_META[colorTheme]
  const handleModeChange = useCallback((value: string) => setMode(value), [setMode])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>テーマ設定</CardTitle>
        <CardDescription>ダークモードとアクセントカラーを変更します。変更内容は自動で保存されます。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-foreground">表示モード</p>
            <span className="text-muted-foreground text-xs">現在: {currentModeLabel}</span>
          </div>
          <Tabs onValueChange={handleModeChange} value={currentMode}>
            <TabsList aria-label="表示モード" className="grid w-full grid-cols-3">
              {/*
                  TabsTrigger の実寸(py-1 + text-sm line-height 20px = 28px)は変えず、
                  ::after のエキスパンダで縦方向のみ当たり判定を 44px(inset-y-2=8px×2 + 28px)
                  へ広げる。TabsList に overflow-hidden は無いため list 外へのはみ出し(4px)も
                  切られない。横方向は広げないため隣接タブのエキスパンダ同士は重ならない
                */}
              <TabsTrigger className="relative flex-1 after:absolute after:-inset-y-2 after:content-['']" value="light">
                ライト
              </TabsTrigger>
              <TabsTrigger className="relative flex-1 after:absolute after:-inset-y-2 after:content-['']" value="dark">
                ダーク
              </TabsTrigger>
              <TabsTrigger
                className="relative flex-1 after:absolute after:-inset-y-2 after:content-['']"
                value="system"
              >
                システム
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="text-muted-foreground text-xs">システムはOSの設定に合わせます。</p>
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-foreground">アクセントカラー</p>
            <span className="inline-flex items-center gap-2 rounded-full bg-muted px-2.5 py-1 text-muted-foreground text-xs">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: currentColorMeta.swatch }}
              />
              現在: {currentColorMeta.label}
            </span>
          </div>
          {ready ? (
            <div className="scrollbar-hide -mx-1 overflow-x-auto px-1">
              <ColorPalette currentTheme={colorTheme} onThemeChange={setColorTheme} />
            </div>
          ) : (
            <Skeleton className="h-8 w-44 rounded-full motion-reduce:animate-none" />
          )}
          <p className="text-muted-foreground text-xs">チェックインやカードの強調色に反映されます。</p>
        </div>
      </CardContent>
    </Card>
  )
}
