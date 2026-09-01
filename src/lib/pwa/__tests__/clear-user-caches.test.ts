import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SW_MSG_CLEAR_USER_CACHE } from '@/constants/pwa'
import { clearUserCachesBestEffort, isUserCacheablePathname } from '@/lib/pwa/clear-user-caches'

const mockCacheKeys = vi.fn()
const mockCacheDelete = vi.fn()
const mockCachesKeys = vi.fn()
const mockCachesOpen = vi.fn()
const mockPostMessage = vi.fn()

const cache = {
  delete: mockCacheDelete,
  keys: mockCacheKeys,
}

function installBrowserMocks(controller: { postMessage: typeof mockPostMessage } | undefined) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { controller },
  })
  Object.defineProperty(globalThis, 'caches', {
    configurable: true,
    value: {
      keys: mockCachesKeys,
      open: mockCachesOpen,
    },
  })
}

describe('isUserCacheablePathname', () => {
  it.each(['/dashboard', '/habits', '/habits/h4', '/analytics'])('ユーザーキャッシュ対象の %s は true', (pathname) => {
    expect(isUserCacheablePathname(pathname)).toBe(true)
  })

  it.each(['/offline', '/api/me', '/settings', '/'])('ユーザーキャッシュ対象外の %s は false', (pathname) => {
    expect(isUserCacheablePathname(pathname)).toBe(false)
  })
})

describe('clearUserCachesBestEffort', () => {
  beforeEach(() => {
    mockCacheKeys.mockReset()
    mockCacheDelete.mockReset()
    mockCachesKeys.mockReset()
    mockCachesOpen.mockReset()
    mockPostMessage.mockReset()
    mockCacheKeys.mockResolvedValue([
      new Request('https://keep-on.example/dashboard'),
      new Request('https://keep-on.example/habits/h4'),
      new Request('https://keep-on.example/offline'),
    ])
    mockCacheDelete.mockResolvedValue(true)
    mockCachesKeys.mockResolvedValue(['keepon-v1', 'other-cache'])
    mockCachesOpen.mockResolvedValue(cache)
    installBrowserMocks({ postMessage: mockPostMessage })
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'caches')
    Reflect.deleteProperty(navigator, 'serviceWorker')
  })

  it('keepon- キャッシュのユーザールートのエントリだけを削除する', async () => {
    await clearUserCachesBestEffort()

    expect(mockPostMessage).toHaveBeenCalledWith({ type: SW_MSG_CLEAR_USER_CACHE })
    expect(mockCachesOpen).toHaveBeenCalledWith('keepon-v1')
    expect(mockCacheDelete).toHaveBeenCalledTimes(2)
    expect(mockCacheDelete).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://keep-on.example/dashboard' }))
    expect(mockCacheDelete).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://keep-on.example/habits/h4' }))
  })

  it('keepon- で始まらないキャッシュは開かない', async () => {
    mockCachesKeys.mockResolvedValue(['other-cache', 'another-cache'])

    await clearUserCachesBestEffort()

    expect(mockCachesOpen).not.toHaveBeenCalled()
    expect(mockCacheDelete).not.toHaveBeenCalled()
  })

  it('controller が undefined でも Cache API の削除を実行する', async () => {
    installBrowserMocks(undefined)

    await clearUserCachesBestEffort()

    expect(mockCacheDelete).toHaveBeenCalledTimes(2)
    expect(mockPostMessage).not.toHaveBeenCalled()
  })

  it('caches が存在しない環境で例外を投げない', async () => {
    Reflect.deleteProperty(globalThis, 'caches')

    await expect(clearUserCachesBestEffort()).resolves.toBeUndefined()
  })
})
