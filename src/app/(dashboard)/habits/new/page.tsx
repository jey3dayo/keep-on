import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { HabitFormServer } from '@/components/habits/HabitFormServer'
import { SIGN_IN_PATH } from '@/constants/auth'
import { createRequestMeta, logInfo, logSpanOptional } from '@/lib/logging'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import { getCurrentUserId } from '@/lib/user'

export const metadata: Metadata = {
  title: '新しい習慣を追加 - KeepOn',
  description: '新しい習慣を作成する',
}

export default async function NewHabitPage() {
  const timeoutMs = getRequestTimeoutMs()
  const requestMeta = createRequestMeta('/habits/new')

  logInfo('request.habits.new:start', requestMeta)

  const userId = await logSpanOptional('habits.new.syncUser', () => getCurrentUserId(), requestMeta, { timeoutMs })

  if (!userId) {
    logInfo('habits.new.syncUser:missing', requestMeta)
    redirect(SIGN_IN_PATH)
  }

  logInfo('request.habits.new:end', requestMeta)

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      <div className="space-y-2">
        <h1 className="font-bold text-3xl text-foreground">新しい習慣を追加</h1>
        <p className="text-muted-foreground">続けたい習慣を登録しましょう</p>
      </div>

      <div className="mx-auto w-full max-w-md">
        <HabitFormServer />
      </div>
    </div>
  )
}
