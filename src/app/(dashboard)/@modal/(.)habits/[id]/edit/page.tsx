import { notFound, redirect } from 'next/navigation'
import { HabitFormServer } from '@/components/habits/HabitFormServer'
import { RouteModal } from '@/components/modals/RouteModal'
import { SIGN_IN_PATH } from '@/constants/auth'
import { createRequestMeta, logInfo, logSpan } from '@/lib/logging'
import { getHabitById } from '@/lib/queries/habit'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import { getCurrentUserId } from '@/lib/user'

interface EditHabitModalPageProps {
  params: Promise<{ id: string }>
}

export default async function EditHabitModalPage({ params }: EditHabitModalPageProps) {
  const timeoutMs = getRequestTimeoutMs()
  const requestMeta = createRequestMeta('/habits/[id]/edit')

  logInfo('request.habits.edit.modal:start', requestMeta)

  const userId = await logSpan('habits.edit.modal.syncUser', () => getCurrentUserId(), requestMeta, { timeoutMs })

  if (!userId) {
    logInfo('habits.edit.modal.syncUser:missing', requestMeta)
    redirect(SIGN_IN_PATH)
  }

  const { id } = await params
  const habit = await logSpan('habits.edit.modal.fetchHabit', () => getHabitById(id), requestMeta, { timeoutMs })

  if (!habit) {
    logInfo('habits.edit.modal.fetchHabit:notFound', requestMeta)
    notFound()
  }

  // 所有権確認
  if (habit.userId !== userId) {
    logInfo('habits.edit.modal.fetchHabit:forbidden', requestMeta)
    redirect('/dashboard')
  }

  logInfo('request.habits.edit.modal:end', requestMeta)

  return (
    <RouteModal title="習慣を編集">
      <HabitFormServer hideHeader initialData={habit} onSuccess="close" submitLabel="更新" />
    </RouteModal>
  )
}
