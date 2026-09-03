import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/access', () => ({
  getAccessIdentity: vi.fn(),
}))

vi.mock('@/lib/cache/user-cache', () => ({
  getUserFromCache: vi.fn().mockResolvedValue(null),
  setUserCache: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../queries/user', () => ({
  claimUserByEmail: vi.fn(),
  getUserByExternalId: vi.fn(),
  upsertUser: vi.fn(),
}))

import { getAccessIdentity } from '@/lib/auth/access'
import { getUserFromCache } from '@/lib/cache/user-cache'
import { claimUserByEmail, getUserByExternalId, upsertUser } from '../queries/user'
import { syncUser } from '../user'

const IDENTITY = { email: 'user@example.com', sub: 'access-sub-1' }

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    createdAt: '2024-01-01T00:00:00.000Z',
    dayStartHour: 24,
    email: IDENTITY.email,
    externalId: IDENTITY.sub,
    id: 'user-1',
    updatedAt: '2024-01-01T00:00:00.000Z',
    weekStart: 'monday',
    ...overrides,
  }
}

describe('syncUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAccessIdentity).mockResolvedValue(IDENTITY)
    vi.mocked(getUserFromCache).mockResolvedValue(null)
  })

  it('identity が取れない場合は null を返し、DB を触らない', async () => {
    vi.mocked(getAccessIdentity).mockResolvedValue(null)

    expect(await syncUser()).toBeNull()
    expect(getUserByExternalId).not.toHaveBeenCalled()
  })

  it('externalId で引けた既存ユーザーはそのまま返す（email 引き当ては行わない）', async () => {
    vi.mocked(getUserByExternalId).mockResolvedValue(userRow())

    const result = await syncUser()

    expect(result?.id).toBe('user-1')
    // 既存ユーザーで往復が増えないことは D1 のレイテンシ上の契約
    expect(claimUserByEmail).not.toHaveBeenCalled()
    expect(upsertUser).not.toHaveBeenCalled()
  })

  it('email が identity とずれている既存ユーザーは upsert で追従させる', async () => {
    vi.mocked(getUserByExternalId).mockResolvedValue(userRow({ email: 'old@example.com' }))
    vi.mocked(upsertUser).mockResolvedValue(userRow())

    const result = await syncUser()

    expect(upsertUser).toHaveBeenCalledWith({ email: IDENTITY.email, externalId: IDENTITY.sub })
    expect(result?.email).toBe(IDENTITY.email)
  })

  it('Clerk ID のまま残る既存ユーザーを email で引き当て、externalId を張り替える（移行パス）', async () => {
    vi.mocked(getUserByExternalId).mockResolvedValue(null)
    // 移行後の行: id は変わらず externalId だけが Access の sub になる
    vi.mocked(claimUserByEmail).mockResolvedValue(userRow())

    const result = await syncUser()

    expect(claimUserByEmail).toHaveBeenCalledWith(IDENTITY.email, IDENTITY.sub)
    // habits / checkins の紐付けを保つため users.id が保持されることが移行の要件
    expect(result?.id).toBe('user-1')
    expect(result?.externalId).toBe(IDENTITY.sub)
    expect(upsertUser).not.toHaveBeenCalled()
  })

  it('externalId でも email でも引けない場合は新規作成する', async () => {
    vi.mocked(getUserByExternalId).mockResolvedValue(null)
    vi.mocked(claimUserByEmail).mockResolvedValue(null)
    vi.mocked(upsertUser).mockResolvedValue(userRow({ id: 'user-new' }))

    const result = await syncUser()

    expect(upsertUser).toHaveBeenCalledWith({ email: IDENTITY.email, externalId: IDENTITY.sub })
    expect(result?.id).toBe('user-new')
  })

  it('開発フォールバックの sub=dev-user でも同期できる', async () => {
    vi.mocked(getAccessIdentity).mockResolvedValue({ email: 'dev@example.com', sub: 'dev-user' })
    vi.mocked(getUserByExternalId).mockResolvedValue(null)
    vi.mocked(claimUserByEmail).mockResolvedValue(null)
    vi.mocked(upsertUser).mockResolvedValue(userRow({ email: 'dev@example.com', externalId: 'dev-user' }))

    const result = await syncUser()

    expect(result?.externalId).toBe('dev-user')
  })
})
