import { notFound, redirect } from 'next/navigation'
import { HabitFormServer } from '@/components/habits/HabitFormServer'
import { SIGN_IN_PATH } from '@/constants/auth'
import { createRequestMeta, logInfo, logSpan } from '@/lib/logging'
import { getHabitById } from '@/lib/queries/habit'
import { getCurrentUserId } from '@/lib/user'

interface EditHabitPageProps {
  params: Promise<{ id: string }>
}

export default async function EditHabitPage({ params }: EditHabitPageProps) {
  const timeoutMs = 8000
  const requestMeta = createRequestMeta('/habits/[id]/edit')

  logInfo('request.habits.edit.page:start', requestMeta)

  const userId = await logSpan('habits.edit.page.syncUser', () => getCurrentUserId(), requestMeta, { timeoutMs })

  if (!userId) {
    logInfo('habits.edit.page.syncUser:missing', requestMeta)
    redirect(SIGN_IN_PATH)
  }

  const { id } = await params
  const habit = await logSpan('habits.edit.page.fetchHabit', () => getHabitById(id), requestMeta, { timeoutMs })

  if (!habit) {
    logInfo('habits.edit.page.fetchHabit:notFound', requestMeta)
    notFound()
  }

  // 所有権確認
  if (habit.userId !== userId) {
    logInfo('habits.edit.page.fetchHabit:forbidden', requestMeta)
    redirect('/dashboard')
  }

  logInfo('request.habits.edit.page:end', requestMeta)

  return (
    <div className="min-h-screen bg-background">
      <HabitFormServer initialData={habit} onSuccess="redirect" submitLabel="更新" />
    </div>
  )
}
