'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import type { WeekStart } from '@/constants/habit'
import { updateUserWeekStart } from '@/lib/queries/user'

export async function updateWeekStartAction(weekStart: WeekStart) {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  await updateUserWeekStart(userId, weekStart)
  revalidatePath('/dashboard')
  revalidatePath('/settings')
}
