// メッセージタイプ・sync タグは src/constants/pwa.ts と同期すること
const CACHE_NAME = 'keepon-v4'
const OFFLINE_URL = '/offline'
const NEXT_ASSET_PREFIX = '/_next/'
const NEXT_STATIC_CSS_PREFIX = '/_next/static/css/'
const NEXT_STATIC_MEDIA_PREFIX = '/_next/static/media/'

// ユーザー固有 HTML をキャッシュ対象にするルート
const CACHEABLE_ROUTES = ['/dashboard', '/habits', '/analytics']

const PRECACHE_FILES = ['/offline', '/manifest.json', '/icon-192.png', '/icon-512.png']

const isUserCacheableRoute = (pathname) => CACHEABLE_ROUTES.some((route) => pathname.startsWith(route))

const isAuthRoute = (pathname) => pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')

const clearUserCache = async (cache) => {
  const requests = await cache.keys()
  await Promise.all(
    requests.filter((req) => isUserCacheableRoute(new URL(req.url).pathname)).map((req) => cache.delete(req))
  )
}

const isAuthNavigationFailure = (response) => {
  if (response.status === 401 || response.status === 403) {
    return true
  }

  if (!(response.redirected && response.url)) {
    return false
  }

  return isAuthRoute(new URL(response.url).pathname)
}

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
      await Promise.all(PRECACHE_FILES.map((file) => cache.add(file).catch(() => undefined)))
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
      event.respondWith(fetch(request).catch(() => caches.match(request).then((cached) => cached || Response.error())))
      return
    }
  }

  // API・認証: network-only (SWスルー)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('clerk')) {
    return
  }

  // サインイン・サインアップ遷移時はユーザー固有キャッシュをクリア（セッション切り替え対策）
  if (isAuthRoute(url.pathname)) {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => clearUserCache(cache)))
    return
  }

  // ナビゲーション
  if (request.mode === 'navigate') {
    const isCacheable = isUserCacheableRoute(url.pathname)

    if (isCacheable) {
      // 認証ページ相当はキャッシュ露出を避けるため network-first にする
      event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
          const cached = await cache.match(request)

          try {
            const networkResp = await fetch(request)

            if (isAuthNavigationFailure(networkResp)) {
              await clearUserCache(cache)
              return networkResp
            }

            if (networkResp.ok && !networkResp.redirected) {
              await cache.put(request, networkResp.clone())
              return networkResp
            }

            return cached || networkResp
          } catch {
            return cached || caches.match(OFFLINE_URL)
          }
        })
      )
    } else {
      // network-first + offline fallback（その他ページ）
      event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
    }
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
            .catch(() => Response.error())
      )
    )
  }
})

// Background Sync: オフライン中に溜まったチェックインを replay
self.addEventListener('sync', (event) => {
  if (event.tag !== 'sync-checkins') {
    return
  }

  event.waitUntil(
    (async () => {
      // DB_NAME, STORE_NAME は src/lib/pwa/offline-queue.ts と同期すること
      const DB_NAME = 'keepon-offline'
      const STORE_NAME = 'checkin-queue'

      const openDb = () =>
        new Promise((resolve, reject) => {
          const req = indexedDB.open(DB_NAME, 1)
          req.onupgradeneeded = (e) => {
            const db = e.target.result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME, { keyPath: 'id' })
            }
          }
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })

      const getAllItems = (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readonly')
          const req = tx.objectStore(STORE_NAME).getAll()
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })

      const deleteItem = (db, id) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite')
          const req = tx.objectStore(STORE_NAME).delete(id)
          req.onsuccess = () => resolve()
          req.onerror = () => reject(req.error)
        })

      // ネットワーク障害時は fetch が throw → waitUntil が reject →
      // ブラウザの Background Sync 自動リトライが発動する
      const db = await openDb()
      let replayedCount = 0
      let hasRetryableError = false
      try {
        const items = await getAllItems(db)
        const sorted = [...items].sort((a, b) => a.timestamp - b.timestamp)

        for (const item of sorted) {
          const res = await fetch('/api/checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ habitId: item.habitId, action: item.action, dateKey: item.dateKey }),
          })
          if (res.ok) {
            await deleteItem(db, item.id)
            replayedCount++
          } else if (res.status === 401 || res.status === 403) {
            // 認証エラーはセッション復帰後にリトライ可能なのでキューに残す
            hasRetryableError = true
            break
          } else if (res.status >= 400 && res.status < 500) {
            // 永続的なバリデーションエラー（422 等）はリトライしても無駄なので削除
            await deleteItem(db, item.id)
          } else {
            // 5xx: サーバー一時障害。アイテムはキューに残し、リトライをスケジュール
            hasRetryableError = true
            break
          }
        }
      } finally {
        db.close()
      }

      // replay 完了をクライアントに通知（router.refresh のトリガー）
      if (replayedCount > 0) {
        const clients = await self.clients.matchAll({ type: 'window' })
        for (const client of clients) {
          client.postMessage({ type: 'SYNC_CHECKINS_COMPLETE', replayedCount })
        }
      }

      // リトライ可能なエラーがあった場合、waitUntil を reject して
      // ブラウザの Background Sync 自動リトライをスケジュールさせる
      if (hasRetryableError) {
        throw new Error('Retryable errors remain in sync queue')
      }
    })()
  )
})

// メッセージハンドラ: 更新通知・サインアウト時のキャッシュクリア
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  // サインアウト時にユーザー固有のキャッシュ（ダッシュボード等）をクリア
  if (event.data?.type === 'CLEAR_USER_CACHE') {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => clearUserCache(cache)))
  }
})
