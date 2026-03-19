import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SW_SYNC_TAG } from '@/constants/pwa'
import { useOfflineCheckin } from './useOfflineCheckin'

let mockIsOnline = false

const mockEnqueueOfflineCheckin = vi.fn()
const mockGetAllQueuedCheckins = vi.fn()
const mockRemoveQueuedCheckin = vi.fn()
const mockSyncRegister = vi.fn()
const mockServiceWorkerAddEventListener = vi.fn()
const mockServiceWorkerRemoveEventListener = vi.fn()

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => mockIsOnline,
}))

vi.mock('@/lib/pwa/offline-queue', () => ({
  enqueueOfflineCheckin: (...args: unknown[]) => mockEnqueueOfflineCheckin(...args),
  getAllQueuedCheckins: (...args: unknown[]) => mockGetAllQueuedCheckins(...args),
  removeQueuedCheckin: (...args: unknown[]) => mockRemoveQueuedCheckin(...args),
}))

const queuedCheckin = (id: string) => ({
  action: 'add' as const,
  dateKey: '2026-03-19',
  habitId: `habit-${id}`,
  id,
  timestamp: Number(id.replaceAll(/\D/g, '')) || 1,
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
    expect(onReplayComplete).toHaveBeenCalledWith({ replayed: 1, failed: 0 })
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
    expect(onReplayComplete).toHaveBeenCalledWith({ replayed: 1, failed: 1 })
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
    expect(onReplayComplete).toHaveBeenCalledWith({ replayed: 0, failed: 1 })
  })
})
