import { type AccessIdentity, getAccessIdentity } from '@/lib/auth/access'
import { getUserFromCache, setUserCache } from '@/lib/cache/user-cache'
import { resetDb } from '@/lib/db'
import { extractDbErrorInfo } from '@/lib/errors/db'
import { safeParseUser } from '@/schemas/user'
import { isTimeoutError, logError, logSpan, logWarn } from './logging'
import { claimUserByEmail, getUserByExternalId, upsertUser } from './queries/user'
import { getRequestTimeoutMs } from './server/timeout'

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

function parseUserRecord(user: unknown, source: 'existing' | 'claim' | 'upsert', externalId: string) {
  if (!user) {
    return null
  }
  const parsed = safeParseUser(user)
  if (!parsed.success) {
    logError('user.schema:invalid', { externalId, issues: parsed.issues, source })
    return null
  }
  return parsed.output
}

async function fetchExistingUserWithRetry(externalId: string, dbTimeoutMs: number) {
  const fetchExisting = (label: string) =>
    logSpan(label, () => getUserByExternalId(externalId), { externalId }, { timeoutMs: dbTimeoutMs })

  try {
    return await fetchExisting('syncUser.getUserByExternalId')
  } catch (error) {
    const retryReason = getRetryableDbReason(error)
    if (!retryReason) {
      throw error
    }
    logWarn('syncUser.getUserByExternalId:reset', { externalId, reason: retryReason, timeoutMs: dbTimeoutMs })
    resetDb()
    return await fetchExisting('syncUser.getUserByExternalId.retry')
  }
}

/**
 * externalId で引けた既存ユーザーを identity の email に追従させる
 */
async function reconcileExistingUser(identity: AccessIdentity, existing: ReturnType<typeof parseUserRecord>) {
  if (!existing) {
    return null
  }

  await setUserCache(identity.sub, existing)

  if (existing.email === identity.email) {
    return existing
  }

  const updated = await logSpan(
    'syncUser.upsertUser',
    () => upsertUser({ email: identity.email, externalId: identity.sub }),
    { externalId: identity.sub, source: 'email-mismatch' }
  )
  const parsedUpdated = parseUserRecord(updated, 'upsert', identity.sub)
  if (parsedUpdated) {
    await setUserCache(identity.sub, parsedUpdated)
  }
  return parsedUpdated
}

/**
 * email で既存ユーザーを引き当てて externalId を張り替える（IdP 移行パス）
 *
 * Clerk ID が入ったままの行を Access の sub へ移すのはここ。users.id は変わらないため
 * habits / checkins の紐付けは保たれる。
 */
async function claimExistingUserByEmail(identity: AccessIdentity) {
  const claimed = await logSpan('syncUser.claimUserByEmail', () => claimUserByEmail(identity.email, identity.sub), {
    externalId: identity.sub,
  })
  const parsedClaimed = parseUserRecord(claimed, 'claim', identity.sub)
  if (parsedClaimed) {
    logWarn('syncUser.claimUserByEmail:migrated', { externalId: identity.sub, userId: parsedClaimed.id })
    await setUserCache(identity.sub, parsedClaimed)
  }
  return parsedClaimed
}

async function createUser(identity: AccessIdentity) {
  const created = await logSpan(
    'syncUser.upsertUser',
    () => upsertUser({ email: identity.email, externalId: identity.sub }),
    { externalId: identity.sub, source: 'access-identity' }
  )
  const parsedCreated = parseUserRecord(created, 'upsert', identity.sub)
  if (parsedCreated) {
    await setUserCache(identity.sub, parsedCreated)
  }
  return parsedCreated
}

/**
 * Cloudflare Access の identity を User テーブルに同期
 * 存在しない場合は新規作成、存在する場合は更新
 */
export async function syncUser() {
  const identity = await getAccessIdentity()
  if (!identity) {
    return null
  }

  // キャッシュチェック
  const cached = await getUserFromCache(identity.sub)
  if (cached) {
    return cached
  }

  const requestTimeoutMs = getRequestTimeoutMs()
  const dbTimeoutMs = Math.max(3000, Math.min(8000, requestTimeoutMs - 2000))
  const existing = await fetchExistingUserWithRetry(identity.sub, dbTimeoutMs)
  const reconciled = await reconcileExistingUser(identity, parseUserRecord(existing, 'existing', identity.sub))
  if (reconciled) {
    return reconciled
  }

  // externalId で引けなかった場合のみ email で引く。既存ユーザーでは通らない経路なので
  // 通常リクエストに往復が増えることはない
  const claimed = await claimExistingUserByEmail(identity)
  if (claimed) {
    return claimed
  }

  return await createUser(identity)
}

/**
 * 現在のユーザーのIDを取得（アプリ内 User ID）
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await syncUser()
  return user?.id ?? null
}
