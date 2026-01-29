import { revalidatePath } from 'next/cache'
import { actionError, actionOk, type ServerActionResultAsync } from '@/lib/actions/result'
import { AuthorizationError, DatabaseError, NotFoundError, UnauthorizedError } from '@/lib/errors/habit'
import { type SerializableHabitError, serializeHabitError } from '@/lib/errors/serializable'
import { getHabitById } from '@/lib/queries/habit'
import { getCurrentUserId } from '@/lib/user'

export type HabitActionResult<T = void> = ServerActionResultAsync<T, SerializableHabitError>

type HabitRecord = NonNullable<Awaited<ReturnType<typeof getHabitById>>>

export async function requireUserId(): HabitActionResult<string> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return actionError(serializeHabitError(new UnauthorizedError()))
  }

  return actionOk(userId)
}

export async function requireOwnedHabit(habitId: string, userId: string): HabitActionResult<HabitRecord> {
  const habit = await getHabitById(habitId)

  if (!habit) {
    return actionError(serializeHabitError(new NotFoundError()))
  }

  if (habit.userId !== userId) {
    return actionError(serializeHabitError(new AuthorizationError()))
  }

  return actionOk(habit)
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
