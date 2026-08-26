// メッセージタイプ・sync タグは src/constants/pwa.ts と同期すること
const CACHE_NAME = 'keepon-v5'
const OFFLINE_URL = '/offline'
const NEXT_ASSET_PREFIX = '/_next/'
const NEXT_STATIC_CSS_PREFIX = '/_next/static/css/'
const NEXT_STATIC_MEDIA_PREFIX = '/_next/static/media/'

// ユーザー固有 HTML をキャッシュ対象にするルート
const CACHEABLE_ROUTES = ['/dashboard', '/habits', '/analytics']

const PRECACHE_FILES = ['/offline', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

// DB_NAME, STORE_NAME, キューアイテムの形（userId を含む）は src/lib/pwa/offline-queue.ts と同期すること
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

const isUserCacheableRoute = (pathname) => CACHEABLE_ROUTES.some((route) => pathname.startsWith(route))

const clearUserCache = async (cache) => {
  const requests = await cache.keys()
  await Promise.all(
    requests.filter((req) => isUserCacheableRoute(new URL(req.url).pathname)).map((req) => cache.delete(req))
  )
}

// 端末共有時に前ユーザーのキューが次ユーザーの Cookie でリプレイされるのを防ぐ
const clearOfflineQueue = async () => {
  // deleteDatabase は他接続があると blocked のまま settle しないため、store の中身だけ消す
  const db = await openDb()
  try {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      return
    }
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const req = tx.objectStore(STORE_NAME).clear()
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

// キャッシュのクリアが本命なので、IndexedDB 側の失敗で全体を reject させない
const clearUserData = async (cache) => {
  await clearUserCache(cache)
  try {
    await clearOfflineQueue()
  } catch {
    // オフラインキューのクリア失敗は致命的ではない
  }
}

// Cloudflare Access のセッション切れ時、fetch にはログインページの HTML が 200(既定で redirect を follow した最終形)で返る。
// res.ok=true のケースに限定して判定する: redirect または非 JSON レスポンスなら Access の割り込みとみなす。
// (4xx/5xx の HTML はステータス分類側で既にリトライ判定されるため、ここでは扱わない)
const isAuthInterceptedResponse = (response) => {
  if (response.redirected) {
    return true
  }
  const contentType = response.headers.get('content-type')
  return !(contentType && contentType.includes('application/json'))
}

const isCrossOriginFinalUrl = (response) => {
  if (!response.url) {
    return false
  }
  try {
    return new URL(response.url).origin !== self.location.origin
  } catch {
    return false
  }
}

// ナビ用: Access 割り込み（redirect / 別オリジン最終 URL）と 401/403 を認証失敗とみなす。
// Clerk 時代の /sign-in・/sign-up 判定は削除済み。
// 同一オリジンの HTML 200 は通常のページ応答なので認証失敗にしない（isAuthInterceptedResponse は API 向け）。
const isAuthNavigationFailure = (response) => {
  if (response.status === 401 || response.status === 403) {
    return true
  }
  return response.redirected || isCrossOriginFinalUrl(response)
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

  // API: network-only (SWスルー)
  if (url.pathname.startsWith('/api/')) {
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
          // SW は現セッションのユーザーを知らないため、userId を持つアイテムだけ送って
          // サーバー側（/api/checkin）で本人照合させる。userId が無い旧アイテムは照合不能なので破棄する
          if (!item.userId) {
            console.warn('[sw] discarding offline checkin without userId', item.id)
            await deleteItem(db, item.id)
            continue
          }

          const res = await fetch('/api/checkin', {
            body: JSON.stringify({
              action: item.action,
              dateKey: item.dateKey,
              habitId: item.habitId,
              userId: item.userId,
            }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
          })
          if (res.ok && isAuthInterceptedResponse(res)) {
            // ok(2xx) だが Access のログイン画面等に差し替えられている可能性がある。401/403 と同様にリトライ対象として残す
            hasRetryableError = true
            break
          } else if (res.ok) {
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
          client.postMessage({ replayedCount, type: 'SYNC_CHECKINS_COMPLETE' })
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
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => clearUserData(cache)))
  }
})
