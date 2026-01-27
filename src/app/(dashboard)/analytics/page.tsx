import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'アナリティクス - KeepOn',
  description:
    '習慣の達成率、トレンド、統計情報を可視化。長期的なパフォーマンス分析で、より良い習慣形成のためのインサイトを得られます。',
  openGraph: {
    title: 'アナリティクス - KeepOn',
    description: '習慣のトレンドと統計を分析・可視化',
    type: 'website',
  },
}

export default function AnalyticsPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <div className="space-y-2 text-center">
        <h1 className="font-bold text-3xl text-foreground">アナリティクス</h1>
        <p className="text-muted-foreground">このページは準備中です</p>
      </div>
    </div>
  )
}
