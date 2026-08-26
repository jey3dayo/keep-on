import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SW_SYNC_TAG } from '@/constants/pwa'
import { useOfflineCheckin } from './useOfflineCheckin'

const CURRENT_USER_ID = 'user-1'

let mockIsOnline = false
let mockUserId: string | null = CURRENT_USER_ID

const mockEnqueueOfflineCheckin = vi.fn()
const mockGetAllQueuedCheckins = vi.fn()
const mockRemoveQueuedCheckin = vi.fn()
const mockSyncRegister = vi.fn()
const mockServiceWorkerAddEventListener = vi.fn()
const mockServiceWorkerRemoveEventListener = vi.fn()

vi.mock('@/contexts/IdentityContext', () => ({
  useIdentity: () => ({ isLoaded: true, userId: mockUserId }),
}))

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => mockIsOnline,
}))

vi.mock('@/lib/pwa/offline-queue', () => ({
  enqueueOfflineCheckin: (...args: unknown[]) => mockEnqueueOfflineCheckin(...args),
  getAllQueuedCheckins: (...args: unknown[]) => mockGetAllQueuedCheckins(...args),
  removeQueuedCheckin: (...args: unknown[]) => mockRemoveQueuedCheckin(...args),
}))

const jsonOkResponse = (status = 200) =>
  ({
    headers: new Headers({ 'content-type': 'application/json' }),
    ok: true,
    redirected: false,
    status,
  }) as Response

const queuedCheckin = (id: string, userId: string | undefined = CURRENT_USER_ID) => ({
  action: 'add' as const,
  dateKey: '2026-03-19',
  habitId: `habit-${id}`,
  id,
  timestamp: Number(id.replaceAll(/\D/g, '')) || 1,
  userId,
})

const installServiceWorkerMock = (enableBgSync: boolean) => {
  if (enableBgSync) {
    Object.defineProperty(window, 'SyncManager', {
      configurable: true,
      value: class SyncManager {},
    })
  } else {
    Reflect.deleteProperty(window, 'SyncManager')
  }

  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      addEventListener: mockServiceWorkerAddEventListener,
      ready: Promise.resolve({
        sync: {
          register: mockSyncRegister,
        },
      }),
      removeEventListener: mockServiceWorkerRemoveEventListener,
    },
  })
}

describe('useOfflineCheckin', () => {
  beforeEach(() => {
    mockIsOnline = false
    mockUserId = CURRENT_USER_ID
    mockEnqueueOfflineCheckin.mockReset()
    mockGetAllQueuedCheckins.mockReset()
    mockRemoveQueuedCheckin.mockReset()
    mockSyncRegister.mockReset()
    mockServiceWorkerAddEventListener.mockReset()
    mockServiceWorkerRemoveEventListener.mockReset()

    vi.stubGlobal('fetch', vi.fn())
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    })
  })

  it('sync.register() が拒否されても再接続時に fallback replay する', async () => {
    mockIsOnline = true
    installServiceWorkerMock(true)
    mockSyncRegister.mockRejectedValueOnce(new Error('denied'))
    mockGetAllQueuedCheckins
      .mockResolvedValueOnce([queuedCheckin('queued-1')])
      .mockResolvedValueOnce([queuedCheckin('queued-1')])
    mockRemoveQueuedCheckin.mockResolvedValue(undefined)
    vi.mocked(fetch).mockResolvedValue(jsonOkResponse())

    const onReplayComplete = vi.fn()

    renderHook(() => useOfflineCheckin({ onReplayComplete }))

    await waitFor(() => {
      expect(mockSyncRegister).toHaveBeenCalledWith(SW_SYNC_TAG)
    })
    await waitFor(() => {
      expect(mockRemoveQueuedCheckin).toHaveBeenCalledWith('queued-1')
    })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(onReplayComplete).toHaveBeenCalledWith({ failed: 0, replayed: 1 })
  })

  it.each([400, 403, 404, 409, 422])('status %s は破棄して後続 replay を継続する', async (status) => {
    mockIsOnline = true
    installServiceWorkerMock(false)
    mockGetAllQueuedCheckins
      .mockResolvedValueOnce([queuedCheckin('queued-1'), queuedCheckin('queued-2')])
      .mockResolvedValueOnce([queuedCheckin('queued-1'), queuedCheckin('queued-2')])
    mockRemoveQueuedCheckin.mockResolvedValue(undefined)
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        headers: new Headers({ 'content-type': 'application/json' }),
        ok: false,
        redirected: false,
        status,
      } as Response)
      .mockResolvedValueOnce(jsonOkResponse())

    const onReplayComplete = vi.fn()

    renderHook(() => useOfflineCheckin({ onReplayComplete }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    expect(mockRemoveQueuedCheckin).toHaveBeenNthCalledWith(1, 'queued-1')
    expect(mockRemoveQueuedCheckin).toHaveBeenNthCalledWith(2, 'queued-2')
    expect(onReplayComplete).toHaveBeenCalledWith({ failed: 1, replayed: 1 })
  })

  it.each([401, 408, 429, 500, 503])('status %s は replay を停止して後続を送らない', async (status) => {
    mockIsOnline = true
    installServiceWorkerMock(false)
    mockGetAllQueuedCheckins
      .mockResolvedValueOnce([queuedCheckin('queued-1'), queuedCheckin('queued-2')])
      .mockResolvedValueOnce([queuedCheckin('queued-1'), queuedCheckin('queued-2')])
    vi.mocked(fetch).mockResolvedValueOnce({
      headers: new Headers({ 'content-type': 'application/json' }),
      ok: false,
      redirected: false,
      status,
    } as Response)

    const onReplayComplete = vi.fn()

    renderHook(() => useOfflineCheckin({ onReplayComplete }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    expect(mockRemoveQueuedCheckin).not.toHaveBeenCalled()
    expect(onReplayComplete).toHaveBeenCalledWith({ failed: 1, replayed: 0 })
  })

  it('別ユーザーの userId を持つアイテムは送信せず破棄する', async () => {
    mockIsOnline = true
    installServiceWorkerMock(false)
    const foreign = queuedCheckin('queued-1', 'user-other')
    mockGetAllQueuedCheckins.mockResolvedValue([foreign])
    mockRemoveQueuedCheckin.mockResolvedValue(undefined)

    renderHook(() => useOfflineCheckin())

    await waitFor(() => {
      expect(mockRemoveQueuedCheckin).toHaveBeenCalledWith('queued-1')
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('userId を持たない旧アイテムは照合不能なので送信せず破棄する', async () => {
    mockIsOnline = true
    installServiceWorkerMock(false)
    // userId フィールドを持たない旧スキーマのアイテム
    const { userId: _userId, ...legacy } = queuedCheckin('queued-1')
    mockGetAllQueuedCheckins.mockResolvedValue([legacy])
    mockRemoveQueuedCheckin.mockResolvedValue(undefined)

    renderHook(() => useOfflineCheckin())

    await waitFor(() => {
      expect(mockRemoveQueuedCheckin).toHaveBeenCalledWith('queued-1')
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('200 + text/html（認証割り込み）は破棄せずキューに残す', async () => {
    mockIsOnline = true
    installServiceWorkerMock(false)
    mockGetAllQueuedCheckins
      .mockResolvedValueOnce([queuedCheckin('queued-1')])
      .mockResolvedValueOnce([queuedCheckin('queued-1')])
    vi.mocked(fetch).mockResolvedValueOnce({
      headers: new Headers({ 'content-type': 'text/html' }),
      ok: true,
      redirected: false,
      status: 200,
    } as Response)

    const onReplayComplete = vi.fn()

    renderHook(() => useOfflineCheckin({ onReplayComplete }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    expect(mockRemoveQueuedCheckin).not.toHaveBeenCalled()
    expect(onReplayComplete).toHaveBeenCalledWith({ failed: 1, replayed: 0 })
  })

  it('400 + text/html は永続エラーとして破棄される', async () => {
    mockIsOnline = true
    installServiceWorkerMock(false)
    mockGetAllQueuedCheckins
      .mockResolvedValueOnce([queuedCheckin('queued-1')])
      .mockResolvedValueOnce([queuedCheckin('queued-1')])
    mockRemoveQueuedCheckin.mockResolvedValue(undefined)
    vi.mocked(fetch).mockResolvedValueOnce({
      headers: new Headers({ 'content-type': 'text/html' }),
      ok: false,
      redirected: false,
      status: 400,
    } as Response)

    const onReplayComplete = vi.fn()

    renderHook(() => useOfflineCheckin({ onReplayComplete }))

    await waitFor(() => {
      expect(mockRemoveQueuedCheckin).toHaveBeenCalledWith('queued-1')
    })

    expect(onReplayComplete).toHaveBeenCalledWith({ failed: 1, replayed: 0 })
  })

  it('サインイン中のユーザーが未確定なら replay しない', async () => {
    mockIsOnline = true
    mockUserId = null
    installServiceWorkerMock(false)
    mockGetAllQueuedCheckins.mockResolvedValue([queuedCheckin('queued-1')])

    renderHook(() => useOfflineCheckin())

    await Promise.resolve()
    expect(mockGetAllQueuedCheckins).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('userId が未確定なら enqueueCheckin は reject しキューに積まない', async () => {
    mockUserId = null
    installServiceWorkerMock(false)

    const { result } = renderHook(() => useOfflineCheckin())

    await expect(result.current.enqueueCheckin('habit-1', 'add', '2026-03-19')).rejects.toThrow(
      'Cannot enqueue offline checkin without a signed-in user'
    )
    expect(mockEnqueueOfflineCheckin).not.toHaveBeenCalled()
  })
})
