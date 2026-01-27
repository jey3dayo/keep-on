import { redirect } from 'next/navigation'
import { HabitFormServer } from '@/components/habits/HabitFormServer'
import { RouteModal } from '@/components/modals/RouteModal'
import { createRequestMeta, logInfo, logSpan } from '@/lib/logging'
import { getCurrentUserId } from '@/lib/user'

export default async function NewHabitModalPage() {
  const timeoutMs = 8000
  const requestMeta = createRequestMeta('/habits/new')

  logInfo('request.habits.new.modal:start', requestMeta)

  const userId = await logSpan('habits.new.modal.syncUser', () => getCurrentUserId(), requestMeta, { timeoutMs })

  if (!userId) {
    logInfo('habits.new.modal.syncUser:missing', requestMeta)
    redirect('/sign-in')
  }

  logInfo('request.habits.new.modal:end', requestMeta)

  return (
    <RouteModal title="新しい習慣を追加">
      <HabitFormServer onSuccess="close" />
    </RouteModal>
  )
}
