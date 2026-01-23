'use server'

import { Result } from '@praha/byethrow'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { DatabaseError, UnauthorizedError, ValidationError } from '@/lib/errors/habit'
import { type FormState, handleHabitError } from '@/lib/errors/handlers'
import { getCurrentUserId } from '@/lib/user'
import { HabitInputSchema } from '@/schemas/habit'

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

// バリデーション（Zod統合）
const validateHabitInput = (userId: string, formData: FormData): Result.Result<HabitInput, ValidationError> => {
  const name = formData.get('name')
  const emoji = formData.get('emoji')

  const parseResult = HabitInputSchema.safeParse({ name, emoji: emoji || null })

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0]
    return Result.fail(
      new ValidationError({
        field: firstIssue?.path.join('.') || 'unknown',
        reason: firstIssue?.message || 'Validation failed',
      })
    )
  }

  return Result.succeed({
    userId,
    name: parseResult.data.name.trim(),
    emoji: parseResult.data.emoji || null,
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

  return handleHabitError(result.error)
}
