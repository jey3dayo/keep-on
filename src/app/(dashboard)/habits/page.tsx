import { currentUser } from '@clerk/nextjs/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/Button'
import { HabitTable } from '@/components/habits/HabitTable'
import { Icon } from '@/components/Icon'
import { SIGN_IN_PATH } from '@/constants/auth'
import { createRequestMeta, logInfo, logSpan } from '@/lib/logging'
import { getCurrentUserId } from '@/lib/user'

export const metadata: Metadata = {
  title: '習慣 - KeepOn',
  description:
    'あなたの習慣を一元管理。新しい習慣の作成、既存の習慣の編集・削除、カテゴリ別の整理、絵文字やカラーのカスタマイズができます。',
  openGraph: {
    title: '習慣管理 - KeepOn',
    description: '習慣の作成、編集、管理を簡単に',
    type: 'website',
  },
}

export default async function HabitsPage() {
  const timeoutMs = 8000
  const requestMeta = createRequestMeta('/habits')

  logInfo('request.habits:start', requestMeta)

  const clerkUser = await logSpan('habits.clerkUser', () => currentUser(), requestMeta, { timeoutMs })

  if (!clerkUser) {
    logInfo('habits.clerkUser:missing', requestMeta)
    redirect(SIGN_IN_PATH)
  }

  const userId = await logSpan('habits.syncUser', () => getCurrentUserId(), requestMeta, { timeoutMs })

  if (!userId) {
    logInfo('habits.syncUser:missing', requestMeta)
    redirect(SIGN_IN_PATH)
  }

  logInfo('request.habits:end', requestMeta)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="font-bold text-3xl text-foreground">習慣</h1>
          <p className="text-muted-foreground">あなたの習慣を管理しましょう</p>
        </div>
        <Button asChild size="lg" variant="default">
          <Link href="/habits/new">
            <Icon className="mr-2" name="plus" size={20} />
            新しい習慣
          </Link>
        </Button>
      </div>
      <HabitTable clerkId={clerkUser.id} requestMeta={requestMeta} userId={userId} />
    </div>
  )
}
