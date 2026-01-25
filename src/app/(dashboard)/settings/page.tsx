import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '設定 - KeepOn',
  description: 'アプリの設定とプロフィール管理',
}

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <div className="space-y-2 text-center">
        <h1 className="font-bold text-3xl text-foreground">設定</h1>
        <p className="text-muted-foreground">このページは準備中です</p>
      </div>
    </div>
  )
}
