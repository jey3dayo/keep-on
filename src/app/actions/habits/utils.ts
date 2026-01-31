import { Result } from '@praha/byethrow'
import { revalidatePath } from 'next/cache'
import { actionError, actionOk, type ServerActionResultAsync } from '@/lib/actions/result'
import {
  AuthorizationError,
  DatabaseError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '@/lib/errors/habit'
import { type SerializableHabitError, serializeHabitError } from '@/lib/errors/serializable'
import { getHabitById } from '@/lib/queries/habit'
import { getCurrentUserId } from '@/lib/user'
import { validateHabitId } from '@/validators/habit-action'

export type HabitActionResult<T = void> = ServerActionResultAsync<T, SerializableHabitError>

type HabitRecord = NonNullable<Awaited<ReturnType<typeof getHabitById>>>
type HabitMutation = (habitId: string, userId: string) => Promise<boolean>
type HabitPrecondition = (habit: HabitRecord) => SerializableHabitError | null

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

export async function runHabitMutation(
  habitId: string,
  mutation: HabitMutation,
  options: { precondition?: HabitPrecondition } = {}
): HabitActionResult {
  const validation = validateHabitId(habitId)
  if (!Result.isSuccess(validation)) {
    return actionError(serializeHabitError(validation.error))
  }

  const validatedHabitId = validation.value
  const userIdResult = await requireUserId()

  if (!userIdResult.ok) {
    return userIdResult
  }

  const habitResult = await requireOwnedHabit(validatedHabitId, userIdResult.data)

  if (!habitResult.ok) {
    return habitResult
  }

  if (options.precondition) {
    const error = options.precondition(habitResult.data)

    if (error) {
      return actionError(error)
    }
  }

  const mutated = await mutation(validatedHabitId, userIdResult.data)

  if (!mutated) {
    return actionError(serializeHabitError(new NotFoundError()))
  }

  revalidateHabitPaths()

  return actionOk()
}

export function serializeActionError(error: unknown, detail: string): SerializableHabitError {
  if (
    error instanceof UnauthorizedError ||
    error instanceof AuthorizationError ||
    error instanceof NotFoundError ||
    error instanceof ValidationError
  ) {
    return serializeHabitError(error)
  }

  const databaseError = error instanceof DatabaseError ? error : new DatabaseError({ detail, cause: error })

  return serializeHabitError(databaseError)
}

export function revalidateHabitPaths() {
  revalidatePath('/habits')
  revalidatePath('/dashboard')
}
