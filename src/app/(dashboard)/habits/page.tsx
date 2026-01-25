import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { HabitTable } from '@/components/habits/HabitTable'
import { getCurrentUserId } from '@/lib/user'

export const metadata: Metadata = {
  title: '習慣管理 - KeepOn',
  description: '習慣の作成、編集、削除を行う',
}

export default async function HabitsPage() {
  const userId = await getCurrentUserId()

  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="space-y-2">
        <h1 className="font-bold text-3xl text-foreground">習慣管理</h1>
        <p className="text-muted-foreground">あなたの習慣を管理しましょう</p>
      </div>
      <HabitTable userId={userId} />
    </div>
  )
}
