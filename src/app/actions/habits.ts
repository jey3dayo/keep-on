'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getCurrentUserId } from '@/lib/user'

type FormState = {
  error: string | null
  success: boolean
}

export async function createHabit(_prevState: FormState, formData: FormData): Promise<FormState> {
  const userId = await getCurrentUserId()

  if (!userId) {
    return { error: 'Unauthorized', success: false }
  }

  const name = formData.get('name')
  const emoji = formData.get('emoji')

  // バリデーション
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { error: 'Name is required', success: false }
  }

  if (name.length > 100) {
    return { error: 'Name is too long (max 100 characters)', success: false }
  }

  if (emoji && typeof emoji !== 'string') {
    return { error: 'Invalid emoji', success: false }
  }

  try {
    await prisma.habit.create({
      data: {
        userId,
        name: name.trim(),
        emoji: emoji || null,
      },
    })

    revalidatePath('/dashboard')
    return { success: true, error: null }
  } catch (error) {
    console.error('Failed to create habit:', error)
    return { error: 'Failed to create habit', success: false }
  }
}
