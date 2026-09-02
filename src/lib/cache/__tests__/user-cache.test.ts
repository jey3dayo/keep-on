import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getKV } from '@/lib/cache/kv'
import { getUserFromCache } from '@/lib/cache/user-cache'
import type { KVNamespace } from '@/types/cloudflare'

vi.mock('@/lib/cache/kv', () => ({
  getKV: vi.fn(),
}))

function buildKvStub(value: string | null): KVNamespace {
  return {
    delete: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(value),
    put: vi.fn().mockResolvedValue(undefined),
  }
}

describe('getUserFromCache', () => {
  const externalId = 'access-sub-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('現行スキーマのキャッシュはパースしてUserを返す', async () => {
    const cached = {
      createdAt: '2026-01-01T00:00:00.000Z',
      dayStartHour: 26,
      email: 'user@example.com',
      externalId,
      id: 'user-123',
      updatedAt: '2026-01-01T00:00:00.000Z',
      weekStart: 'monday',
    }
    vi.mocked(getKV).mockResolvedValue(buildKvStub(JSON.stringify(cached)))

    const result = await getUserFromCache(externalId)

    expect(result).not.toBeNull()
    expect(result?.dayStartHour).toBe(26)
    expect(result?.id).toBe('user-123')
  })

  it('dayStartHourを持たない旧形式のキャッシュはnullを返す（DB再取得に落とす）', async () => {
    const legacyCached = {
      createdAt: '2026-01-01T00:00:00.000Z',
      email: 'user@example.com',
      externalId,
      id: 'user-123',
      updatedAt: '2026-01-01T00:00:00.000Z',
      weekStart: 'monday',
    }
    vi.mocked(getKV).mockResolvedValue(buildKvStub(JSON.stringify(legacyCached)))

    const result = await getUserFromCache(externalId)

    expect(result).toBeNull()
  })

  it('キャッシュが存在しない場合はnullを返す', async () => {
    vi.mocked(getKV).mockResolvedValue(buildKvStub(null))

    const result = await getUserFromCache(externalId)

    expect(result).toBeNull()
  })

  it('KVがnull（ローカル環境）の場合はnullを返す', async () => {
    vi.mocked(getKV).mockResolvedValue(null)

    const result = await getUserFromCache(externalId)

    expect(result).toBeNull()
  })
})
