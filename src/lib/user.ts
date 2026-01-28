import { isClerkAPIResponseError } from '@clerk/nextjs/errors'
import { currentUser } from '@clerk/nextjs/server'
import { StatusCodes } from 'http-status-codes'
import { parseClerkApiResponseErrorPayload, safeParseUser } from '@/schemas/user'
import { logError } from './logging'
import { getUserByClerkId, upsertUser } from './queries/user'

function parseClerkApiResponseError(error: unknown) {
  if (isClerkAPIResponseError(error)) {
    const errors = Array.isArray(error.errors)
      ? error.errors
          .filter((entry): entry is NonNullable<typeof entry> => entry != null)
          .map((entry) => ({ code: entry.code, message: entry.message }))
      : undefined

    return {
      status: error.status,
      clerkTraceId: error.clerkTraceId ?? undefined,
      errors,
    }
  }

  return parseClerkApiResponseErrorPayload(error)
}

/**
 * Clerk認証されたユーザーをPrismaのUserテーブルに同期
 * 存在しない場合は新規作成、存在する場合は更新
 */
export async function syncUser() {
  let clerkUser: Awaited<ReturnType<typeof currentUser>> = null

  try {
    clerkUser = await currentUser()
  } catch (error) {
    const parsed = parseClerkApiResponseError(error)
    if (parsed) {
      if (parsed.status === StatusCodes.UNAUTHORIZED || parsed.status === StatusCodes.FORBIDDEN) {
        return null
      }
      logError('clerk.currentUser:api-error', parsed)
      return null
    }
    throw error
  }

  if (!clerkUser) {
    return null
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress
  if (!email) {
    throw new Error('Email address not found')
  }

  const parseUser = (user: unknown, source: 'existing' | 'upsert') => {
    const parsed = safeParseUser(user)
    if (!parsed.success) {
      logError('user.schema:invalid', { clerkId: clerkUser.id, source, issues: parsed.issues })
      return null
    }
    return parsed.output
  }

  const existing = await getUserByClerkId(clerkUser.id)
  if (existing) {
    const parsedExisting = parseUser(existing, 'existing')
    if (!parsedExisting) {
      const repaired = await upsertUser({
        clerkId: clerkUser.id,
        email,
      })
      return parseUser(repaired, 'upsert')
    }

    if (parsedExisting.email !== email) {
      const updated = await upsertUser({
        clerkId: clerkUser.id,
        email,
      })
      return parseUser(updated, 'upsert')
    }
    return parsedExisting
  }

  // 初回ログイン時はユーザーを作成
  const created = await upsertUser({
    clerkId: clerkUser.id,
    email,
  })
  return parseUser(created, 'upsert')
}

/**
 * 現在のユーザーのIDを取得（Prisma User ID）
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await syncUser()
  return user?.id ?? null
}
