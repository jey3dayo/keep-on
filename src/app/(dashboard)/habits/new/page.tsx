import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { HabitFormServer } from '@/components/habits/HabitFormServer'
import { HabitPresetSelectorWrapper } from '@/components/habits/HabitPresetSelectorWrapper'
import { SIGN_IN_PATH } from '@/constants/auth'
import { habitPresets } from '@/constants/habit-data'
import { createRequestMeta, logInfo, logSpanOptional } from '@/lib/logging'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import { getCurrentUserId } from '@/lib/user'

export const metadata: Metadata = {
  title: '新しい習慣を追加 - KeepOn',
  description: '新しい習慣を作成する',
}

export default async function NewHabitPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; preset?: string }>
}) {
  const timeoutMs = getRequestTimeoutMs()
  const requestMeta = createRequestMeta('/habits/new')

  logInfo('request.habits.new:start', requestMeta)

  const userId = await logSpanOptional('habits.new.syncUser', () => getCurrentUserId(), requestMeta, { timeoutMs })

  if (!userId) {
    logInfo('habits.new.syncUser:missing', requestMeta)
    redirect(SIGN_IN_PATH)
  }

  const params = await searchParams
  const step = params.step || 'form'
  const presetId = params.preset

  // プリセットIDから初期値を取得
  const presetData = presetId ? habitPresets.find((p) => p.id === presetId) : undefined

  logInfo('request.habits.new:end', requestMeta)

  if (step === 'preset') {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4">
        <HabitPresetSelectorWrapper />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      <div className="space-y-2">
        <h1 className="font-bold text-3xl text-foreground">新しい習慣を追加</h1>
        <p className="text-muted-foreground">続けたい習慣を登録しましょう</p>
      </div>

      <div className="mx-auto w-full max-w-md">
        <HabitFormServer initialData={presetData} />
      </div>
    </div>
  )
}
