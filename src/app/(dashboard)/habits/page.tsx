import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/Button'
import { HabitTable } from '@/components/habits/HabitTable'
import { Icon } from '@/components/Icon'
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
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="font-bold text-3xl text-foreground">習慣管理</h1>
          <p className="text-muted-foreground">あなたの習慣を管理しましょう</p>
        </div>
        <Button asChild size="lg" variant="default">
          <Link href="/habits/new">
            <Icon className="mr-2" name="plus" size={20} />
            新しい習慣
          </Link>
        </Button>
      </div>
      <HabitTable userId={userId} />
    </div>
  )
}
