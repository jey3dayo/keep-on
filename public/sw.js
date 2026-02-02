const CACHE_NAME = 'keepon-v2'
const OFFLINE_URL = '/offline'
const NEXT_ASSET_PREFIX = '/_next/'

const PRECACHE_FILES = ['/', '/offline', '/manifest.json', '/icon-192.png', '/icon-512.png']

// インストール時: プリキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_FILES)))
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

  // Next.js ビルド成果物は常にネットワーク優先（Server ActionsのID不一致を回避）
  if (url.pathname.startsWith(NEXT_ASSET_PREFIX)) {
    return
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
