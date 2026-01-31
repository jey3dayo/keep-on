import { isClerkAPIResponseError } from '@clerk/nextjs/errors'
import { auth, currentUser } from '@clerk/nextjs/server'
import { StatusCodes } from 'http-status-codes'
import { getUserFromCache, setUserCache } from '@/lib/cache/user-cache'
import { resetDb } from '@/lib/db'
import { extractDbErrorInfo } from '@/lib/errors/db'
import { parseClerkApiResponseErrorPayload, safeParseUser } from '@/schemas/user'
import { isTimeoutError, logError, logSpan, logWarn } from './logging'
import { getUserByClerkId, upsertUser } from './queries/user'
import { getRequestTimeoutMs } from './server/timeout'

function getEmailFromSessionClaims(claims: unknown): string | null {
  if (!claims || typeof claims !== 'object') {
    return null
  }

  const record = claims as Record<string, unknown>
  const candidates = ['email', 'email_address', 'primary_email_address', 'primary_email']
  for (const key of candidates) {
    const value = record[key]
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  }
  return null
}

const globalForSessionClaims = globalThis as typeof globalThis & {
  __missingSessionEmailLogged?: boolean
}

function logMissingSessionEmail(clerkId: string, claims: unknown): void {
  if (globalForSessionClaims.__missingSessionEmailLogged) {
    return
  }

  const claimKeys = claims && typeof claims === 'object' ? Object.keys(claims as Record<string, unknown>) : []

  logWarn('clerk.sessionClaims:missing-email', { clerkId, claimKeys })
  globalForSessionClaims.__missingSessionEmailLogged = true
}

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

function getRetryableDbReason(error: unknown): string | null {
  if (isTimeoutError(error)) {
    return 'timeout'
  }
  const { message, code } = extractDbErrorInfo(error)
  const normalized = message.toLowerCase()

  if (code === 'ECONNRESET' || normalized.includes('econnreset')) {
    return 'econnreset'
  }
  if (code === '57P01' || normalized.includes('connection terminated')) {
    return 'connection-terminated'
  }
  if (code === '57014' || normalized.includes('statement timeout') || normalized.includes('query canceled')) {
    return 'timeout'
  }
  if (code === '53300' || normalized.includes('too many connections')) {
    return 'too_many_connections'
  }
  if (code === '55P03' || normalized.includes('lock_not_available')) {
    return 'lock_not_available'
  }
  return null
}

type ExistingUserRecord = Awaited<ReturnType<typeof getUserByClerkId>> | null

function parseUserRecord(user: unknown, source: 'existing' | 'upsert', logClerkId: string) {
  if (!user) {
    return null
  }
  const parsed = safeParseUser(user)
  if (!parsed.success) {
    logError('user.schema:invalid', { clerkId: logClerkId, source, issues: parsed.issues })
    return null
  }
  return parsed.output
}

async function fetchExistingUserWithRetry(clerkId: string, dbTimeoutMs: number): Promise<ExistingUserRecord> {
  const fetchExisting = (label: string) =>
    logSpan(label, () => getUserByClerkId(clerkId), { clerkId }, { timeoutMs: dbTimeoutMs })

  try {
    return await fetchExisting('syncUser.getUserByClerkId')
  } catch (error) {
    const retryReason = getRetryableDbReason(error)
    if (!retryReason) {
      throw error
    }
    logWarn('syncUser.getUserByClerkId:reset', { clerkId, timeoutMs: dbTimeoutMs, reason: retryReason })
    await resetDb(`syncUser.getUserByClerkId ${retryReason}`)
    return await fetchExisting('syncUser.getUserByClerkId.retry')
  }
}

async function handleExistingUser(params: {
  clerkId: string
  existing: ReturnType<typeof parseUserRecord>
  emailFromClaims: string | null
  sessionClaims: unknown
}): Promise<ReturnType<typeof parseUserRecord>> {
  const { clerkId, existing, emailFromClaims, sessionClaims } = params

  if (!existing) {
    return null
  }

  await setUserCache(clerkId, existing)

  if (!emailFromClaims) {
    logMissingSessionEmail(clerkId, sessionClaims)
    return existing
  }

  if (existing.email === emailFromClaims) {
    return existing
  }

  const updated = await logSpan(
    'syncUser.upsertUser',
    () =>
      upsertUser({
        clerkId,
        email: emailFromClaims,
      }),
    { clerkId, source: 'email-mismatch' }
  )
  const parsedUpdated = parseUserRecord(updated, 'upsert', clerkId)
  if (parsedUpdated) {
    await setUserCache(clerkId, parsedUpdated)
  }
  return parsedUpdated
}

async function upsertUserFromClaims(clerkId: string, emailFromClaims: string | null) {
  if (!emailFromClaims) {
    return null
  }

  const created = await logSpan(
    'syncUser.upsertUser',
    () =>
      upsertUser({
        clerkId,
        email: emailFromClaims,
      }),
    { clerkId, source: 'claim-email' }
  )
  const parsedCreated = parseUserRecord(created, 'upsert', clerkId)
  if (parsedCreated) {
    await setUserCache(clerkId, parsedCreated)
  }
  return parsedCreated
}

async function fetchClerkUserSafe(clerkId: string): Promise<Awaited<ReturnType<typeof currentUser>> | null> {
  try {
    return await logSpan('syncUser.currentUser', () => currentUser(), { clerkId })
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
}

/**
 * Clerk認証されたユーザーをPrismaのUserテーブルに同期
 * 存在しない場合は新規作成、存在する場合は更新
 */
export async function syncUser() {
  const { userId: clerkId, sessionClaims } = await auth()
  if (!clerkId) {
    return null
  }

  // キャッシュチェック
  const cached = await getUserFromCache(clerkId)
  if (cached) {
    return cached
  }

  const requestTimeoutMs = getRequestTimeoutMs()
  const dbTimeoutMs = Math.max(3000, Math.min(8000, requestTimeoutMs - 2000))
  const existing = await fetchExistingUserWithRetry(clerkId, dbTimeoutMs)
  const parsedExisting = parseUserRecord(existing, 'existing', clerkId)
  const emailFromClaims = getEmailFromSessionClaims(sessionClaims)
  const handledExisting = await handleExistingUser({
    clerkId,
    existing: parsedExisting,
    emailFromClaims,
    sessionClaims,
  })
  if (handledExisting) {
    return handledExisting
  }

  const createdFromClaims = await upsertUserFromClaims(clerkId, emailFromClaims)
  if (createdFromClaims) {
    return createdFromClaims
  }

  const clerkUser = await fetchClerkUserSafe(clerkId)

  if (!clerkUser) {
    return null
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress
  if (!email) {
    throw new Error('Email address not found')
  }

  const created = await upsertUser({ clerkId: clerkUser.id, email })
  const parsedClerkCreated = parseUserRecord(created, 'upsert', clerkUser.id)
  if (parsedClerkCreated) {
    await setUserCache(clerkUser.id, parsedClerkCreated)
  }
  return parsedClerkCreated
}

/**
 * 現在のユーザーのIDを取得（Prisma User ID）
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await syncUser()
  return user?.id ?? null
}
