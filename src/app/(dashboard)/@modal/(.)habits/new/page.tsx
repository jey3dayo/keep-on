import { redirect } from 'next/navigation'
import { HabitFormServer } from '@/components/habits/HabitFormServer'
import { HabitPresetSelectorWrapper } from '@/components/habits/HabitPresetSelectorWrapper'
import { RouteModal } from '@/components/modals/RouteModal'
import { SIGN_IN_PATH } from '@/constants/auth'
import { habitPresets } from '@/constants/habit-data'
import { createRequestMeta, logInfo, logSpanOptional } from '@/lib/logging'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import { getCurrentUserId } from '@/lib/user'

export default async function NewHabitModalPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; preset?: string }>
}) {
  const timeoutMs = getRequestTimeoutMs()
  const requestMeta = createRequestMeta('/habits/new')

  logInfo('request.habits.new.modal:start', requestMeta)

  const userId = await logSpanOptional('habits.new.modal.syncUser', () => getCurrentUserId(), requestMeta, {
    timeoutMs,
  })

  if (!userId) {
    logInfo('habits.new.modal.syncUser:missing', requestMeta)
    redirect(SIGN_IN_PATH)
  }

  const params = await searchParams
  const step = params.step || 'form'
  const presetId = params.preset
  const presetData = presetId ? habitPresets.find((p) => p.id === presetId) : undefined

  logInfo('request.habits.new.modal:end', requestMeta)

  const title = step === 'preset' ? '習慣を追加' : '新しい習慣を追加'

  return (
    <RouteModal title={title}>
      {step === 'preset' ? (
        <HabitPresetSelectorWrapper />
      ) : (
        <HabitFormServer hideHeader={true} initialData={presetData} onSuccess="close" />
      )}
    </RouteModal>
  )
}
