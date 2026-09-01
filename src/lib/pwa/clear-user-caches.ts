import { SW_CACHE_NAME_PREFIX, SW_MSG_CLEAR_USER_CACHE, SW_USER_CACHEABLE_ROUTE_PREFIXES } from '@/constants/pwa'

export function isUserCacheablePathname(pathname: string): boolean {
  return SW_USER_CACHEABLE_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function clearUserCachesBestEffort(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined') {
      navigator.serviceWorker?.controller?.postMessage({ type: SW_MSG_CLEAR_USER_CACHE })
    }

    if (!('caches' in globalThis)) {
      return
    }

    const cacheNames = await caches.keys()
    const userCacheNames = cacheNames.filter((name) => name.startsWith(SW_CACHE_NAME_PREFIX))

    await Promise.all(
      userCacheNames.map(async (cacheName) => {
        const cache = await caches.open(cacheName)
        const requests = await cache.keys()
        const userRequests = requests.filter((request) => isUserCacheablePathname(new URL(request.url).pathname))

        await Promise.all(userRequests.map((request) => cache.delete(request)))
      })
    )
  } catch {
    // キャッシュのクリアに失敗してもログアウト遷移は続行する。
  }
}
