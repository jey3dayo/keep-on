import { isClerkAPIResponseError } from '@clerk/nextjs/errors'
import { currentUser } from '@clerk/nextjs/server'
import { logError } from './logging'
import { upsertUser } from './queries/user'

interface ClerkAPIResponseErrorLike {
  name?: string
  status?: number
  clerkTraceId?: string | null
  errors?: Array<{ code?: string; message?: string }>
  constructor?: { kind?: string }
}

function isClerkAPIResponseErrorLike(error: unknown): error is ClerkAPIResponseErrorLike {
  if (isClerkAPIResponseError(error)) {
    return true
  }

  if (!error || typeof error !== 'object') {
    return false
  }

  const candidate = error as ClerkAPIResponseErrorLike

  if (candidate.name === 'ClerkAPIResponseError') {
    return true
  }

  return candidate.constructor?.kind === 'ClerkAPIResponseError'
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
    if (isClerkAPIResponseErrorLike(error)) {
      const errors = Array.isArray(error.errors)
        ? error.errors.map((entry) => ({ code: entry.code, message: entry.message }))
        : undefined

      logError('clerk.currentUser:api-error', {
        status: typeof error.status === 'number' ? error.status : undefined,
        clerkTraceId: typeof error.clerkTraceId === 'string' ? error.clerkTraceId : undefined,
        errors,
      })
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

  // ユーザーを取得または作成
  return await upsertUser({
    clerkId: clerkUser.id,
    email,
  })
}

/**
 * 現在のユーザーのIDを取得（Prisma User ID）
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await syncUser()
  return user?.id ?? null
}
