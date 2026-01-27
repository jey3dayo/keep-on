import { isClerkAPIResponseError } from '@clerk/nextjs/errors'
import { currentUser } from '@clerk/nextjs/server'
import { parseClerkApiResponseErrorPayload } from '@/schemas/user'
import { logError } from './logging'
import { upsertUser } from './queries/user'

function parseClerkApiResponseError(error: unknown) {
  if (isClerkAPIResponseError(error)) {
    return {
      status: error.status,
      clerkTraceId: error.clerkTraceId ?? undefined,
      errors: error.errors?.map((entry) => ({ code: entry?.code, message: entry?.message })),
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
