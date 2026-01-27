import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ヘルプ - KeepOn',
  description:
    'KeepOnの使い方ガイド、よくある質問、トラブルシューティング。アプリの活用方法を知りたい場合や、困ったときにご確認ください。',
  openGraph: {
    title: 'ヘルプ - KeepOn',
    description: '使い方ガイドとよくある質問',
    type: 'website',
  },
}

export default function HelpPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <div className="space-y-2 text-center">
        <h1 className="font-bold text-3xl text-foreground">ヘルプ</h1>
        <p className="text-muted-foreground">このページは準備中です</p>
      </div>
    </div>
  )
}
