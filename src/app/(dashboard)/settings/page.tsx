import type { Metadata } from 'next'

import { ThemeSettings } from '@/components/settings/ThemeSettings'
import { WeekStartSettings } from '@/components/settings/WeekStartSettings'

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

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="font-bold text-3xl text-foreground">設定</h1>
        <p className="text-muted-foreground">アプリの表示をカスタマイズできます。</p>
      </div>
      <ThemeSettings />
      <WeekStartSettings />
    </div>
  )
}
