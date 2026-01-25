import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '習慣管理 - KeepOn',
  description: '習慣の作成、編集、削除を行う',
}

export default function HabitsPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <div className="space-y-2 text-center">
        <h1 className="font-bold text-3xl text-foreground">習慣管理</h1>
        <p className="text-muted-foreground">このページは準備中です</p>
      </div>
    </div>
  )
}
