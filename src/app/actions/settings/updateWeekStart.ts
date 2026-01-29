'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import type { WeekStart } from '@/constants/habit'
import { actionError, actionOk, type ServerActionResultAsync } from '@/lib/actions/result'
import { updateUserWeekStart } from '@/lib/queries/user'

type SerializableSettingsError =
  | { name: 'UnauthorizedError'; message: string }
  | { name: 'DatabaseError'; message: string }

export async function updateWeekStartAction(
  weekStart: WeekStart
): ServerActionResultAsync<void, SerializableSettingsError> {
  const { userId } = await auth()

  if (!userId) {
    return actionError({ name: 'UnauthorizedError', message: 'Unauthorized' })
  }

  try {
    await updateUserWeekStart(userId, weekStart)
    revalidatePath('/dashboard')
    revalidatePath('/settings')
    return actionOk()
  } catch (error) {
    console.error('Failed to update week start', error)
    return actionError({ name: 'DatabaseError', message: '週の開始日の更新に失敗しました' })
  }
}
