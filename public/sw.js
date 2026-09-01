// メッセージタイプ・ナビゲーションSWRメッセージ・sync タグは
// src/constants/pwa.ts と同期すること
// ビルドをまたぐと旧HTMLがデプロイで消えたCSSを参照するため、SWキャッシュをビルド単位に分ける。
// activate の掃除で旧ビルドのキャッシュを回収する。
const SW_VERSION = new URL(self.location.href).searchParams.get('v') || 'dev'
const CACHE_NAME = `keepon-${SW_VERSION}`
const OFFLINE_URL = '/offline'
const NEXT_ASSET_PREFIX = '/_next/'
const NEXT_STATIC_CSS_PREFIX = '/_next/static/css/'
const NEXT_STATIC_MEDIA_PREFIX = '/_next/static/media/'

// ユーザー固有 HTML をキャッシュ対象にするルート
// ルート定義の同期先は src/constants/pwa.ts の SW_USER_CACHEABLE_ROUTE_PREFIXES
const CACHEABLE_ROUTES = ['/dashboard', '/habits', '/analytics']

const PRECACHE_FILES = ['/offline', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

// DB_NAME, STORE_NAME, キューアイテムの形（id を opId として使う・userId を含む）は src/lib/pwa/offline-queue.ts と同期すること
const DB_NAME = 'keepon-offline'
const STORE_NAME = 'checkin-queue'
// 非リトライ status は src/constants/pwa.ts の OFFLINE_CHECKIN_NON_RETRYABLE_STATUSES と同期すること
const OFFLINE_CHECKIN_NON_RETRYABLE_STATUSES = [400, 403, 404, 409, 422]

const isNonRetryableOfflineCheckinStatus = (status) => OFFLINE_CHECKIN_NON_RETRYABLE_STATUSES.includes(status)

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

const broadcastToClients = async (message) => {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
  for (const client of clients) {
    client.postMessage(message)
  }
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
      let requestSucceeded = false
      req.onsuccess = () => {
        requestSucceeded = true
      }
      req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
      tx.oncomplete = () => {
        if (requestSucceeded) {
          resolve()
          return
        }
        reject(new Error('IndexedDB transaction completed without a successful request'))
      }
      tx.onerror = () => reject(tx.error ?? req.error ?? new Error('IndexedDB transaction failed'))
      tx.onabort = () => reject(tx.error ?? req.error ?? new Error('IndexedDB transaction aborted'))
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

const revalidateNavigation = async (request, cache, pathname) => {
  let networkResp
  try {
    networkResp = await fetch(request)
  } catch {
    return
  }

  if (isAuthNavigationFailure(networkResp)) {
    await clearUserCache(cache)
    await broadcastToClients({ type: 'NAV_AUTH_LOST' }).catch(() => undefined)
    return
  }

  if (networkResp.ok && !networkResp.redirected) {
    await cache.put(request, networkResp.clone())
    await broadcastToClients({ path: pathname, type: 'NAV_REVALIDATED' }).catch(() => undefined)
  }
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
      const handling = caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request)

        if (cached) {
          // stale 即応は直前セッション本人の再訪を前提とした意図的なトレードオフ。
          // セッション切れ・ユーザー交代時の露出は、背面再検証の NAV_AUTH_LOST と ServiceWorkerRegistration の
          // CLEAR_USER_CACHE で数秒内に回収する。
          broadcastToClients({ path: url.pathname, type: 'NAV_STALE_SERVED' }).catch(() => undefined)
          return { response: cached, revalidate: () => revalidateNavigation(request, cache, url.pathname) }
        }

        try {
          const networkResp = await fetch(request)

          if (isAuthNavigationFailure(networkResp)) {
            await clearUserCache(cache)
            return { response: networkResp, revalidate: null }
          }

          if (networkResp.ok && !networkResp.redirected) {
            await cache.put(request, networkResp.clone())
            return { response: networkResp, revalidate: null }
          }

          return { response: cached || networkResp, revalidate: null }
        } catch {
          return { response: cached || caches.match(OFFLINE_URL), revalidate: null }
        }
      })
      event.respondWith(handling.then((h) => h.response))
      event.waitUntil(handling.then((h) => h.revalidate?.()).catch(() => undefined))
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
          let requestSucceeded = false
          let result
          req.onsuccess = () => {
            requestSucceeded = true
            result = req.result
          }
          req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
          tx.oncomplete = () => {
            if (requestSucceeded) {
              resolve(result)
              return
            }
            reject(new Error('IndexedDB transaction completed without a successful request'))
          }
          tx.onerror = () => reject(tx.error ?? req.error ?? new Error('IndexedDB transaction failed'))
          tx.onabort = () => reject(tx.error ?? req.error ?? new Error('IndexedDB transaction aborted'))
        })

      const deleteItem = (db, id) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite')
          const req = tx.objectStore(STORE_NAME).delete(id)
          let requestSucceeded = false
          req.onsuccess = () => {
            requestSucceeded = true
          }
          req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
          tx.oncomplete = () => {
            if (requestSucceeded) {
              resolve()
              return
            }
            reject(new Error('IndexedDB transaction completed without a successful request'))
          }
          tx.onerror = () => reject(tx.error ?? req.error ?? new Error('IndexedDB transaction failed'))
          tx.onabort = () => reject(tx.error ?? req.error ?? new Error('IndexedDB transaction aborted'))
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
              opId: item.id,
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
          } else if (isNonRetryableOfflineCheckinStatus(res.status)) {
            console.warn('[sw] discarding non-retryable offline checkin', {
              habitId: item.habitId,
              status: res.status,
            })
            await deleteItem(db, item.id)
          } else if (res.status === 401 || res.status === 408 || res.status === 429 || res.status >= 500) {
            // 認証切れ・レート制限・サーバー障害は将来成功しうるためキューに残す
            hasRetryableError = true
            break
          } else {
            // 未知のステータスは安全側に倒し、アイテムを残してリトライする
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
