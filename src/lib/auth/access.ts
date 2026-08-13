import { createRemoteJWKSet, type JWTPayload, type JWTVerifyGetKey, jwtVerify } from 'jose'
import { headers } from 'next/headers'
import { isDevFallbackAllowed } from '@/lib/auth/environment'
import { logWarn } from '@/lib/logging'

const ACCESS_JWT_HEADER = 'Cf-Access-Jwt-Assertion'
const DEV_ACCESS_SUB = 'dev-user'

export interface AccessIdentity {
  email: string
  sub: string
}

export interface VerifyAccessJwtOptions {
  /** テストから createLocalJWKSet を差し込むための seam。未指定なら Access の JWKS を使う。 */
  keySet?: JWTVerifyGetKey
}

interface AccessConfig {
  aud: string
  issuer: string
  teamDomain: string
}

// createRemoteJWKSet は生成インスタンス内で鍵をキャッシュするため、インスタンス自体を使い回す。
// モジュール評価時に env を読むと Workers バンドルで空になるので、初回呼び出し時に生成する。
let cachedKeySet: JWTVerifyGetKey | null = null
let cachedKeySetTeamDomain: string | null = null

function readEnv(name: string): string | undefined {
  return process.env[name]
}

function resolveConfig(): AccessConfig {
  const teamDomain = readEnv('ACCESS_TEAM_DOMAIN')
  const aud = readEnv('ACCESS_AUD')

  if (!teamDomain) {
    throw new Error('ACCESS_TEAM_DOMAIN is not configured')
  }
  if (!aud) {
    throw new Error('ACCESS_AUD is not configured')
  }

  return { aud, issuer: `https://${teamDomain}`, teamDomain }
}

function resolveKeySet(config: AccessConfig): JWTVerifyGetKey {
  if (cachedKeySet && cachedKeySetTeamDomain === config.teamDomain) {
    return cachedKeySet
  }

  const keySet = createRemoteJWKSet(new URL(`${config.issuer}/cdn-cgi/access/certs`))
  cachedKeySet = keySet
  cachedKeySetTeamDomain = config.teamDomain

  return keySet
}

function toIdentity(payload: JWTPayload): AccessIdentity {
  const email = payload.email
  const sub = payload.sub

  if (typeof email !== 'string' || email.length === 0) {
    throw new Error('Access JWT is missing the email claim')
  }
  if (typeof sub !== 'string' || sub.length === 0) {
    throw new Error('Access JWT is missing the sub claim')
  }

  return { email, sub }
}

export async function verifyAccessJwt(token: string, options?: VerifyAccessJwtOptions): Promise<AccessIdentity> {
  const config = resolveConfig()
  const keySet = options?.keySet ?? resolveKeySet(config)

  const { payload } = await jwtVerify(token, keySet, {
    // Cloudflare Access の application token は RS256 固定。alg 混同攻撃を塞ぐ
    algorithms: ['RS256'],
    audience: config.aud,
    issuer: config.issuer,
  })

  return toIdentity(payload)
}

function resolveDevIdentity(): AccessIdentity | null {
  // fail-closed: 明示的に development と判定できない環境では DEV_ACCESS_EMAIL を見ない
  if (!isDevFallbackAllowed()) {
    return null
  }

  const email = readEnv('DEV_ACCESS_EMAIL')
  if (!email) {
    return null
  }

  return { email, sub: DEV_ACCESS_SUB }
}

export async function getAccessIdentity(options?: VerifyAccessJwtOptions): Promise<AccessIdentity | null> {
  const requestHeaders = await headers()
  const token = requestHeaders.get(ACCESS_JWT_HEADER)

  // ヘッダがある場合は必ず検証する。検証失敗を開発フォールバックで救済しない。
  if (!token) {
    return resolveDevIdentity()
  }

  try {
    return await verifyAccessJwt(token, options)
  } catch (error) {
    logWarn('access.jwt:invalid', { reason: error instanceof Error ? error.message : 'unknown' })
    return null
  }
}
