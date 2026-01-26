import { redirect } from 'next/navigation'
import { HabitFormServer } from '@/components/habits/HabitFormServer'
import { RouteModal } from '@/components/modals/RouteModal'
import { getCurrentUserId } from '@/lib/user'

export default async function NewHabitModalPage() {
  const userId = await getCurrentUserId()

  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <RouteModal title="新しい習慣を追加">
      <HabitFormServer onSuccess="close" />
    </RouteModal>
  )
}
