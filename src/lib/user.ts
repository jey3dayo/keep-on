import { isClerkAPIResponseError } from '@clerk/nextjs/errors'
import { currentUser } from '@clerk/nextjs/server'
import * as v from 'valibot'
import { logError } from './logging'
import { upsertUser } from './queries/user'

const ClerkApiErrorEntrySchema = v.object({
  code: v.optional(v.string()),
  message: v.optional(v.string()),
})

const ClerkApiResponseErrorSchema = v.object({
  name: v.optional(v.string()),
  status: v.optional(v.number()),
  clerkTraceId: v.optional(v.nullable(v.string())),
  errors: v.optional(v.array(v.optional(ClerkApiErrorEntrySchema))),
})

function parseClerkApiResponseError(error: unknown) {
  if (isClerkAPIResponseError(error)) {
    return {
      status: error.status,
      clerkTraceId: error.clerkTraceId ?? undefined,
      errors: error.errors?.map((entry) => ({ code: entry?.code, message: entry?.message })),
    }
  }

  const parsed = v.safeParse(ClerkApiResponseErrorSchema, error)
  if (!parsed.success || parsed.output.name !== 'ClerkAPIResponseError') {
    return null
  }

  const { status, clerkTraceId, errors } = parsed.output

  return {
    status,
    clerkTraceId: clerkTraceId ?? undefined,
    errors: errors?.map((entry) => ({ code: entry?.code, message: entry?.message })),
  }
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
