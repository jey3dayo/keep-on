import type { Metadata } from 'next'
import { cookies } from 'next/headers'

import { PageShell } from '@/components/PageShell'
import { AccountSettings } from '@/components/settings/AccountSettings'
import { ThemeSettings } from '@/components/settings/ThemeSettings'
import { WeekStartSettings } from '@/components/settings/WeekStartSettings'
import { COLOR_THEME_COOKIE_KEY, isColorTheme } from '@/constants/theme'

export const metadata: Metadata = {
  description:
    'アプリの表示設定、テーマカスタマイズ、週の開始日の設定など、KeepOnを快適に使うための各種設定を管理できます。',
  openGraph: {
    description: 'アプリの表示と動作をカスタマイズ',
    title: '設定 - KeepOn',
    type: 'website',
  },
  title: '設定 - KeepOn',
}

export default async function SettingsPage() {
  const cookieStore = await cookies()
  const rawColorTheme = cookieStore.get(COLOR_THEME_COOKIE_KEY)?.value ?? null
  const initialColorTheme = rawColorTheme && isColorTheme(rawColorTheme) ? rawColorTheme : undefined

  return (
    <PageShell>
      <header>
        <p className="text-muted-foreground">アプリの表示をカスタマイズできます。</p>
      </header>
      <section className="grid min-w-0 gap-6 lg:grid-cols-2">
        <ThemeSettings className="min-w-0" initialColorTheme={initialColorTheme} />
        <WeekStartSettings className="min-w-0" />
        <AccountSettings className="min-w-0" />
      </section>
    </PageShell>
  )
}
