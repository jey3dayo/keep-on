import type { Metadata } from 'next'
import { cookies } from 'next/headers'

import { ThemeSettings } from '@/components/settings/ThemeSettings'
import { WeekStartSettings } from '@/components/settings/WeekStartSettings'
import { COLOR_THEME_COOKIE_KEY, isColorTheme } from '@/constants/theme'

export const metadata: Metadata = {
  title: '設定 - KeepOn',
  description:
    'アプリの表示設定、テーマカスタマイズ、週の開始日の設定など、KeepOnを快適に使うための各種設定を管理できます。',
  openGraph: {
    title: '設定 - KeepOn',
    description: 'アプリの表示と動作をカスタマイズ',
    type: 'website',
  },
}

export default async function SettingsPage() {
  const cookieStore = await cookies()
  const rawColorTheme = cookieStore.get(COLOR_THEME_COOKIE_KEY)?.value ?? null
  const initialColorTheme = rawColorTheme && isColorTheme(rawColorTheme) ? rawColorTheme : undefined

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="font-bold text-3xl text-foreground">設定</h1>
        <p className="text-muted-foreground">アプリの表示をカスタマイズできます。</p>
      </div>
      <ThemeSettings initialColorTheme={initialColorTheme} />
      <WeekStartSettings />
    </div>
  )
}
