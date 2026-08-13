// @vitest-environment node
import { createLocalJWKSet, exportJWK, generateKeyPair, type JWK, SignJWT } from 'jose'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { getAccessIdentity, verifyAccessJwt } from '@/lib/auth/access'

const TEAM_DOMAIN = 'example.cloudflareaccess.com'
const ISSUER = `https://${TEAM_DOMAIN}`
const AUD = 'a'.repeat(64)
const ALG = 'RS256'

const headersMock = vi.hoisted(() => vi.fn())

vi.mock('next/headers', () => ({
  headers: headersMock,
}))

let privateKey: CryptoKey
let publicJwk: JWK

beforeAll(async () => {
  const keyPair = await generateKeyPair(ALG, { extractable: true })
  privateKey = keyPair.privateKey
  publicJwk = await exportJWK(keyPair.publicKey)
})

function localKeySet() {
  return createLocalJWKSet({ keys: [{ ...publicJwk, alg: ALG }] })
}

function signToken(options?: { aud?: string; email?: string | null; expiresIn?: string; sub?: string }) {
  const payload: Record<string, unknown> = { sub: options?.sub ?? 'user-sub-1' }
  const email = options?.email === undefined ? 'user@example.com' : options.email
  if (email !== null) {
    payload.email = email
  }

  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(options?.aud ?? AUD)
    .setExpirationTime(options?.expiresIn ?? '5m')
    .sign(privateKey)
}

function stubAccessEnv(overrides?: { devEmail?: string; nextjsEnv?: string; nodeEnv?: string }) {
  vi.stubEnv('ACCESS_TEAM_DOMAIN', TEAM_DOMAIN)
  vi.stubEnv('ACCESS_AUD', AUD)
  vi.stubEnv('NODE_ENV', overrides?.nodeEnv ?? 'development')
  vi.stubEnv('NEXTJS_ENV', overrides?.nextjsEnv ?? '')
  vi.stubEnv('DEV_ACCESS_EMAIL', overrides?.devEmail ?? '')
}

function stubHeaders(token?: string) {
  const requestHeaders = new Headers()
  if (token) {
    requestHeaders.set('Cf-Access-Jwt-Assertion', token)
  }
  headersMock.mockResolvedValue(requestHeaders)
}

afterEach(() => {
  vi.unstubAllEnvs()
  headersMock.mockReset()
})

describe('verifyAccessJwt', () => {
  it('returns the identity for a valid token', async () => {
    stubAccessEnv()
    const token = await signToken()

    await expect(verifyAccessJwt(token, { keySet: localKeySet() })).resolves.toEqual({
      email: 'user@example.com',
      sub: 'user-sub-1',
    })
  })

  it('rejects a token whose audience does not match', async () => {
    stubAccessEnv()
    const token = await signToken({ aud: 'b'.repeat(64) })

    await expect(verifyAccessJwt(token, { keySet: localKeySet() })).rejects.toThrow()
  })

  it('rejects an expired token', async () => {
    stubAccessEnv()
    const token = await signToken({ expiresIn: '-1m' })

    await expect(verifyAccessJwt(token, { keySet: localKeySet() })).rejects.toThrow()
  })

  it('rejects a token signed with a different algorithm', async () => {
    stubAccessEnv()
    const secret = new Uint8Array(32).fill(7)
    const token = await new SignJWT({ email: 'user@example.com', sub: 'user-sub-1' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(AUD)
      .setExpirationTime('5m')
      .sign(secret)

    await expect(verifyAccessJwt(token, { keySet: () => Promise.resolve(secret) })).rejects.toThrow()
  })

  it('rejects a token without an email claim', async () => {
    stubAccessEnv()
    const token = await signToken({ email: null })

    await expect(verifyAccessJwt(token, { keySet: localKeySet() })).rejects.toThrow(/email/)
  })
})

describe('getAccessIdentity', () => {
  it('verifies the header token', async () => {
    stubAccessEnv()
    stubHeaders(await signToken())

    await expect(getAccessIdentity({ keySet: localKeySet() })).resolves.toEqual({
      email: 'user@example.com',
      sub: 'user-sub-1',
    })
  })

  it('returns null when the header token fails verification, even in development', async () => {
    stubAccessEnv({ devEmail: 'dev@example.com' })
    stubHeaders(await signToken({ aud: 'b'.repeat(64) }))

    await expect(getAccessIdentity({ keySet: localKeySet() })).resolves.toBeNull()
  })

  it('falls back to the dev identity when the header is absent in development', async () => {
    stubAccessEnv({ devEmail: 'dev@example.com' })
    stubHeaders()

    await expect(getAccessIdentity({ keySet: localKeySet() })).resolves.toEqual({
      email: 'dev@example.com',
      sub: 'dev-user',
    })
  })

  it('returns null when the header is absent in production', async () => {
    stubAccessEnv({ devEmail: 'dev@example.com', nodeEnv: 'production' })
    stubHeaders()

    await expect(getAccessIdentity({ keySet: localKeySet() })).resolves.toBeNull()
  })

  // Workers は NODE_ENV を設定しない。NEXTJS_ENV=production だけの本番相当で
  // dev フォールバックが発動しないことを固定する
  it('returns null when the header is absent and only NEXTJS_ENV marks production', async () => {
    stubAccessEnv({ devEmail: 'dev@example.com', nextjsEnv: 'production', nodeEnv: '' })
    stubHeaders()

    await expect(getAccessIdentity({ keySet: localKeySet() })).resolves.toBeNull()
  })

  it('returns null when the header is absent and DEV_ACCESS_EMAIL is unset', async () => {
    stubAccessEnv()
    stubHeaders()

    await expect(getAccessIdentity({ keySet: localKeySet() })).resolves.toBeNull()
  })
})
