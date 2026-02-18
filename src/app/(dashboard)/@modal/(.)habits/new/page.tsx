import dynamic from 'next/dynamic'
import { redirect } from 'next/navigation'
import { RouteModal } from '@/components/modals/RouteModal'
import { SIGN_IN_PATH } from '@/constants/auth'
import { habitPresets } from '@/constants/habit-data'
import { createRequestMeta, logInfo, logSpanOptional } from '@/lib/logging'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import { getCurrentUserId } from '@/lib/user'

// Dynamic imports for modal content - only load what's needed for the current step
const HabitPresetSelectorWrapper = dynamic(() =>
  import('@/components/habits/HabitPresetSelectorWrapper').then((mod) => ({
    default: mod.HabitPresetSelectorWrapper,
  }))
)

const HabitFormServer = dynamic(() =>
  import('@/components/habits/HabitFormServer').then((mod) => ({ default: mod.HabitFormServer }))
)

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

  return (
    <RouteModal compact={step === 'preset'} title={step === 'preset' ? undefined : '新しい習慣を追加'}>
      {step === 'preset' ? (
        <HabitPresetSelectorWrapper />
      ) : (
        <HabitFormServer hideHeader={true} initialData={presetData} onSuccess="close" />
      )}
    </RouteModal>
  )
}
