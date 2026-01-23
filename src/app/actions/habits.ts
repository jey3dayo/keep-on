'use server'

import { Result } from '@praha/byethrow'
import { ErrorFactory } from '@praha/error-factory'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getCurrentUserId } from '@/lib/user'

// カスタムエラー定義
export class UnauthorizedError extends ErrorFactory({
  name: 'UnauthorizedError',
  message: 'User is not authenticated',
}) {}

export class ValidationError extends ErrorFactory({
  name: 'ValidationError',
  message: 'Validation failed',
  fields: ErrorFactory.fields<{ field: string; reason: string }>(),
}) {}

export class DatabaseError extends ErrorFactory({
  name: 'DatabaseError',
  message: 'Database operation failed',
}) {}

export type HabitError = UnauthorizedError | ValidationError | DatabaseError

interface FormState {
  error: string | null
  success: boolean
}

interface HabitInput {
  userId: string
  name: string
  emoji: string | null
}

// 認証チェック
const authenticateUser = async (): Promise<Result.ResultAsync<string, UnauthorizedError>> => {
  const userId = await getCurrentUserId()
  if (!userId) {
    return Result.fail(new UnauthorizedError())
  }
  return Result.succeed(userId)
}

// バリデーション
const validateHabitInput = (userId: string, formData: FormData): Result.Result<HabitInput, ValidationError> => {
  const name = formData.get('name')
  const emoji = formData.get('emoji')

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return Result.fail(new ValidationError({ field: 'name', reason: 'Name is required' }))
  }

  if (name.length > 100) {
    return Result.fail(new ValidationError({ field: 'name', reason: 'Name is too long (max 100 characters)' }))
  }

  if (emoji && typeof emoji !== 'string') {
    return Result.fail(new ValidationError({ field: 'emoji', reason: 'Invalid emoji' }))
  }

  return Result.succeed({
    userId,
    name: name.trim(),
    emoji: emoji || null,
  })
}

// データベース保存
const saveHabit = Result.try({
  try: async (input: HabitInput) => {
    await prisma.habit.create({
      data: input,
    })
  },
  catch: (error) => new DatabaseError({ cause: error }),
})

export async function createHabit(_prevState: FormState, formData: FormData): Promise<FormState> {
  const userIdResult = await authenticateUser()

  const result = await Result.pipe(
    userIdResult,
    Result.andThen((userId) => validateHabitInput(userId, formData)),
    Result.andThen((input) => saveHabit(input))
  )

  if (Result.isSuccess(result)) {
    revalidatePath('/dashboard')
    return { success: true, error: null }
  }

  // エラーハンドリング
  const error = result.error
  switch (error.name) {
    case 'UnauthorizedError':
      return { error: 'Unauthorized', success: false }
    case 'ValidationError':
      return { error: error.reason, success: false }
    case 'DatabaseError':
      console.error('Failed to create habit:', error.cause)
      return { error: 'Failed to create habit', success: false }
    default: {
      const _exhaustive: never = error
      console.error('Unexpected error:', _exhaustive)
      return { error: 'An unexpected error occurred', success: false }
    }
  }
}
