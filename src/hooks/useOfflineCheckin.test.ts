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

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ isLoaded: true, userId: mockUserId }),
}))

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => mockIsOnline,
}))

vi.mock('@/lib/pwa/offline-queue', () => ({
  enqueueOfflineCheckin: (...args: unknown[]) => mockEnqueueOfflineCheckin(...args),
  getAllQueuedCheckins: (...args: unknown[]) => mockGetAllQueuedCheckins(...args),
  removeQueuedCheckin: (...args: unknown[]) => mockRemoveQueuedCheckin(...args),
}))

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
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
    } as Response)

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

  it('永続的な 4xx は破棄して後続 replay を継続する', async () => {
    mockIsOnline = true
    installServiceWorkerMock(false)
    mockGetAllQueuedCheckins
      .mockResolvedValueOnce([queuedCheckin('queued-1'), queuedCheckin('queued-2')])
      .mockResolvedValueOnce([queuedCheckin('queued-1'), queuedCheckin('queued-2')])
    mockRemoveQueuedCheckin.mockResolvedValue(undefined)
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 422,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response)

    const onReplayComplete = vi.fn()

    renderHook(() => useOfflineCheckin({ onReplayComplete }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    expect(mockRemoveQueuedCheckin).toHaveBeenNthCalledWith(1, 'queued-1')
    expect(mockRemoveQueuedCheckin).toHaveBeenNthCalledWith(2, 'queued-2')
    expect(onReplayComplete).toHaveBeenCalledWith({ failed: 1, replayed: 1 })
  })

  it('retryable な失敗では replay を停止して後続を送らない', async () => {
    mockIsOnline = true
    installServiceWorkerMock(false)
    mockGetAllQueuedCheckins
      .mockResolvedValueOnce([queuedCheckin('queued-1'), queuedCheckin('queued-2')])
      .mockResolvedValueOnce([queuedCheckin('queued-1'), queuedCheckin('queued-2')])
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
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
})
