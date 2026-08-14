import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/basics/Button'
import { Icon } from '@/components/basics/Icon'
import { HabitTable } from '@/components/habits/HabitTable'
import { PageShell } from '@/components/PageShell'
import { SIGN_IN_PATH } from '@/constants/auth'
import { createRequestMeta, logInfo, logSpanOptional } from '@/lib/logging'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import { syncUser } from '@/lib/user'

export const metadata: Metadata = {
  description:
    'あなたの習慣を一元管理。新しい習慣の作成、既存の習慣の編集・削除、カテゴリ別の整理、絵文字やカラーのカスタマイズができます。',
  openGraph: {
    description: '習慣の作成、編集、管理を簡単に',
    title: '習慣管理 - KeepOn',
    type: 'website',
  },
  title: '習慣 - KeepOn',
}

export default async function HabitsPage() {
  const timeoutMs = getRequestTimeoutMs()
  const requestMeta = createRequestMeta('/habits')

  logInfo('request.habits:start', requestMeta)

  const user = await logSpanOptional('habits.syncUser', () => syncUser(), requestMeta, { timeoutMs })

  if (!user) {
    logInfo('habits.syncUser:missing', requestMeta)
    redirect(SIGN_IN_PATH)
  }

  logInfo('request.habits:end', requestMeta)

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">あなたの習慣を管理しましょう</p>
        <Button asChild size="lg" variant="default">
          <Link href="/habits/new?step=preset">
            <Icon className="mr-2" name="plus" size={20} />
            新しい習慣
          </Link>
        </Button>
      </div>
      <HabitTable requestMeta={requestMeta} userId={user.id} />
    </PageShell>
  )
}
