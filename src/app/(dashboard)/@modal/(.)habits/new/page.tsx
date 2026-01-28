import { redirect } from 'next/navigation'
import { HabitFormServer } from '@/components/habits/HabitFormServer'
import { RouteModal } from '@/components/modals/RouteModal'
import { SIGN_IN_PATH } from '@/constants/auth'
import { createRequestMeta, logInfo, logSpan } from '@/lib/logging'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import { getCurrentUserId } from '@/lib/user'

export default async function NewHabitModalPage() {
  const timeoutMs = getRequestTimeoutMs()
  const requestMeta = createRequestMeta('/habits/new')

  logInfo('request.habits.new.modal:start', requestMeta)

  const userId = await logSpan('habits.new.modal.syncUser', () => getCurrentUserId(), requestMeta, { timeoutMs })

  if (!userId) {
    logInfo('habits.new.modal.syncUser:missing', requestMeta)
    redirect(SIGN_IN_PATH)
  }

  logInfo('request.habits.new.modal:end', requestMeta)

  return (
    <RouteModal title="新しい習慣を追加">
      <HabitFormServer onSuccess="close" />
    </RouteModal>
  )
}
