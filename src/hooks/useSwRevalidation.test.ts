import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SW_MSG_NAV_AUTH_LOST, SW_MSG_NAV_REVALIDATED, SW_MSG_NAV_STALE_SERVED } from '@/constants/pwa'
import { useSwRevalidation } from './useSwRevalidation'

const mockRouterRefresh = vi.hoisted(() => vi.fn())

let mockPendingCount = 0
let mockPathname = '/dashboard'
let messageHandler: ((event: MessageEvent<unknown>) => void) | null = null

const mockServiceWorkerAddEventListener = vi.fn((_type: 'message', handler: (event: MessageEvent<unknown>) => void) => {
  messageHandler = handler
})
const mockServiceWorkerRemoveEventListener = vi.fn(
  (_type: 'message', handler: (event: MessageEvent<unknown>) => void) => {
    if (messageHandler === handler) {
      messageHandler = null
    }
  }
)

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ refresh: mockRouterRefresh }),
}))

vi.mock('@/contexts/SyncContext', () => ({
  useSyncContext: () => ({ pendingCount: mockPendingCount }),
}))

const installServiceWorkerMock = () => {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      addEventListener: mockServiceWorkerAddEventListener,
      removeEventListener: mockServiceWorkerRemoveEventListener,
    },
  })
}

const dispatchMessage = (type: string, path?: string) => {
  const handler = messageHandler
  if (!handler) {
    throw new Error('Service Worker message handler is not installed')
  }
  const data = path === undefined ? { type } : { path, type }
  act(() => {
    handler(new MessageEvent<unknown>('message', { data }))
  })
}

describe('useSwRevalidation', () => {
  beforeEach(() => {
    mockPendingCount = 0
    mockPathname = '/dashboard'
    messageHandler = null
    mockRouterRefresh.mockReset()
    mockServiceWorkerAddEventListener.mockReset()
    mockServiceWorkerRemoveEventListener.mockReset()
    installServiceWorkerMock()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    Reflect.deleteProperty(navigator, 'serviceWorker')
  })

  it('NAV_REVALIDATED 受信後にデバウンスして router.refresh を呼ぶ', () => {
    renderHook(() => useSwRevalidation())

    dispatchMessage(SW_MSG_NAV_REVALIDATED, mockPathname)
    act(() => {
      vi.advanceTimersByTime(499)
    })
    expect(mockRouterRefresh).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(mockRouterRefresh).toHaveBeenCalledTimes(1)
  })

  it('NAV_REVALIDATED の path が現在ルートと不一致の場合は refresh しない', () => {
    renderHook(() => useSwRevalidation())

    dispatchMessage(SW_MSG_NAV_REVALIDATED, '/settings')
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockRouterRefresh).not.toHaveBeenCalled()
  })

  it('pendingCount が 0 になるまで refresh を待ち、完了後は 1 回だけ呼ぶ', () => {
    mockPendingCount = 1
    const { rerender } = renderHook(() => useSwRevalidation())

    dispatchMessage(SW_MSG_NAV_REVALIDATED, mockPathname)
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(mockRouterRefresh).not.toHaveBeenCalled()

    mockPendingCount = 0
    rerender()
    expect(mockRouterRefresh).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(mockRouterRefresh).toHaveBeenCalledTimes(1)
  })

  it('NAV_AUTH_LOST 受信時にフルリロードする', () => {
    const reload = vi.fn()
    vi.stubGlobal('window', { location: { reload } })
    renderHook(() => useSwRevalidation())

    dispatchMessage(SW_MSG_NAV_AUTH_LOST)

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('NAV_STALE_SERVED で表示し、NAV_REVALIDATED 後に非表示にする', () => {
    const { result } = renderHook(() => useSwRevalidation())

    dispatchMessage(SW_MSG_NAV_STALE_SERVED, mockPathname)
    expect(result.current.isStale).toBe(true)

    dispatchMessage(SW_MSG_NAV_REVALIDATED, mockPathname)
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current.isStale).toBe(false)
  })

  it('path 不一致の NAV_STALE_SERVED では stale 状態を変更しない', () => {
    const { result } = renderHook(() => useSwRevalidation())

    dispatchMessage(SW_MSG_NAV_STALE_SERVED, '/settings')

    expect(result.current.isStale).toBe(false)
  })

  it('NAV_REVALIDATED が来ない場合は 5 秒後にフォールバック refresh する', () => {
    const { result } = renderHook(() => useSwRevalidation())

    dispatchMessage(SW_MSG_NAV_STALE_SERVED, mockPathname)
    act(() => {
      vi.advanceTimersByTime(4999)
    })
    expect(mockRouterRefresh).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(mockRouterRefresh).toHaveBeenCalledTimes(1)
    expect(result.current.isStale).toBe(false)

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(mockRouterRefresh).toHaveBeenCalledTimes(1)
  })
})
