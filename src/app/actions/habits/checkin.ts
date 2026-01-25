'use server'

import { auth } from '@clerk/nextjs/server'
import { Result } from '@praha/byethrow'
import { revalidatePath } from 'next/cache'
import { createCheckin, deleteCheckinByHabitAndDate, findCheckinByHabitAndDate } from '@/lib/queries/checkin'

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

class DatabaseError extends Error {
  cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'DatabaseError'
    this.cause = cause
  }
}

export async function toggleCheckinAction(habitId: string, date: Date = new Date()) {
  return await Result.try({
    try: async () => {
      const { userId } = await auth()
      if (!userId) {
        throw new AuthenticationError('認証されていません')
      }

      const existingCheckin = await findCheckinByHabitAndDate(habitId, date)

      if (existingCheckin) {
        await deleteCheckinByHabitAndDate(habitId, date)
        revalidatePath('/dashboard')
        return { success: true, action: 'deleted' as const }
      }

      await createCheckin({ habitId, date })
      revalidatePath('/dashboard')
      return { success: true, action: 'created' as const }
    },
    catch: (error) => {
      if (error instanceof AuthenticationError) {
        return error
      }
      return new DatabaseError('チェックインの切り替えに失敗しました', error)
    },
  })()
}
