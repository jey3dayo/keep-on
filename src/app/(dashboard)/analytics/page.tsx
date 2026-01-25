import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '分析 - KeepOn',
  description: '習慣のトレンドと統計を確認',
}

export default function AnalyticsPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <div className="space-y-2 text-center">
        <h1 className="font-bold text-3xl text-foreground">分析</h1>
        <p className="text-muted-foreground">このページは準備中です</p>
      </div>
    </div>
  )
}
