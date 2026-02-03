const CACHE_NAME = 'keepon-v3'
const OFFLINE_URL = '/offline'
const NEXT_ASSET_PREFIX = '/_next/'
const NEXT_STATIC_PREFIX = '/_next/static/'
const NEXT_STATIC_CSS_PREFIX = '/_next/static/css/'
const NEXT_STATIC_MEDIA_PREFIX = '/_next/static/media/'

const PRECACHE_FILES = ['/', '/offline', '/manifest.json', '/icon-192.png', '/icon-512.png']

const extractOfflineAssets = (html) => {
  const assets = new Set()
  const pattern = /["'](\/_next\/static\/[^"']+\.(?:css|js|mjs|woff2?|ttf|otf|eot))["']/g
  let match = pattern.exec(html)
  while (match) {
    assets.add(match[1])
    match = pattern.exec(html)
  }
  return Array.from(assets)
}

const precacheOfflineAssets = async (cache) => {
  try {
    const response = await fetch(OFFLINE_URL, { cache: 'no-store' })
    const html = await response.clone().text()
    await cache.put(OFFLINE_URL, response)
    const assets = extractOfflineAssets(html)
    if (assets.length > 0) {
      await cache.addAll(assets)
    }
  } catch {
    // オフライン用の追加プリキャッシュは失敗しても致命的ではない
  }
}

// インストール時: プリキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(PRECACHE_FILES)
      await precacheOfflineAssets(cache)
    })
  )
})

// アクティベート時: 古いキャッシュ削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
  )
  self.clients.claim()
})

// フェッチ戦略
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Next.js ビルド成果物は基本ネットワーク優先（Server ActionsのID不一致を回避）
  if (url.pathname.startsWith(NEXT_ASSET_PREFIX)) {
    const isAllowedStatic =
      url.pathname.startsWith(NEXT_STATIC_CSS_PREFIX) || url.pathname.startsWith(NEXT_STATIC_MEDIA_PREFIX)
    if (!isAllowedStatic) {
      if (request.method !== 'GET') {
        return
      }
      event.respondWith(
        fetch(request).catch(() =>
          caches.match(request).then((cached) => cached || Response.error())
        )
      )
      return
    }
  }

  // API・認証: network-only (SWスルー)
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/sign-in') ||
    url.pathname.startsWith('/sign-up') ||
    url.hostname.includes('clerk')
  ) {
    return
  }

  // ナビゲーション: network-first + offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  // 静的アセット: cache-first
  if (['image', 'style', 'script', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((response) => {
              const clone = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
              return response
            })
            .catch(() => cached || Response.error())
      )
    )
  }
})

// 更新通知用
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
