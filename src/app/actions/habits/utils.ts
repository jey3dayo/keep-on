'use server'

import { Result } from '@praha/byethrow'
import { revalidatePath } from 'next/cache'
import { AuthorizationError, DatabaseError, NotFoundError, UnauthorizedError } from '@/lib/errors/habit'
import { type SerializableHabitError, serializeHabitError } from '@/lib/errors/serializable'
import { getHabitById } from '@/lib/queries/habit'
import { getCurrentUserId } from '@/lib/user'

export type HabitActionResult<T = void> = Result.ResultAsync<T, SerializableHabitError>

type HabitRecord = NonNullable<Awaited<ReturnType<typeof getHabitById>>>

export async function requireUserId(): HabitActionResult<string> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return Result.fail(serializeHabitError(new UnauthorizedError()))
  }

  return Result.succeed(userId)
}

export async function requireOwnedHabit(habitId: string, userId: string): HabitActionResult<HabitRecord> {
  const habit = await getHabitById(habitId)

  if (!habit) {
    return Result.fail(serializeHabitError(new NotFoundError()))
  }

  if (habit.userId !== userId) {
    return Result.fail(serializeHabitError(new AuthorizationError()))
  }

  return Result.succeed(habit)
}

export function serializeActionError(error: unknown, detail: string): SerializableHabitError {
  if (error instanceof UnauthorizedError || error instanceof AuthorizationError || error instanceof NotFoundError) {
    return serializeHabitError(error)
  }

  const databaseError = error instanceof DatabaseError ? error : new DatabaseError({ detail, cause: error })

  return serializeHabitError(databaseError)
}

export function revalidateHabitPaths() {
  revalidatePath('/habits')
  revalidatePath('/dashboard')
}
