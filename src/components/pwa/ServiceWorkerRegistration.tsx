'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/basics/Button'
import { SW_MSG_SKIP_WAITING } from '@/constants/pwa'
import { useIdentity } from '@/contexts/IdentityContext'
import { clearUserCachesBestEffort } from '@/lib/pwa/clear-user-caches'

export function ServiceWorkerRegistration() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const { isLoaded, userId } = useIdentity()
  const isSignedIn = isLoaded ? userId !== null : undefined
  const previousUserId = useRef<string | null>(null)

  // サインアウト（signed-in → signed-out）とユーザー交代（userId の変化）を検知して
  // ユーザー固有データのクリアを SW に依頼する。オフラインキューはこの経路でのみ消えるため、
  // セッション期限切れだけでは本人の未送信チェックインは失われない。
  useEffect(() => {
    const prev = previousUserId.current

    if (isSignedIn && userId) {
      previousUserId.current = userId
      // 期限切れ後に別ユーザーがログインした場合、前ユーザーのデータを破棄する
      if (prev && prev !== userId) {
        clearUserCachesBestEffort().catch(() => undefined)
      }
      return
    }

    // isSignedIn が undefined（認証状態読み込み中）の間は判定を保留する
    if (isSignedIn !== false || !prev) {
      return
    }

    previousUserId.current = null
    clearUserCachesBestEffort().catch(() => undefined)
  }, [isSignedIn, userId])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    if (process.env.NODE_ENV !== 'production') {
      // Dev 環境では SW を無効化して HMR/キャッシュの不整合を避ける
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister()
        }
      })
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key)
        }
      })
      return
    }

    navigator.serviceWorker
      // SW 自身にビルド ID を埋め込むため、登録 URL は安定させる
      .register('/sw.js')
      .then((reg) => {
        setRegistration(reg)

        // ページロード時に既にwaiting状態のSWがある場合の対応
        if (reg.waiting && navigator.serviceWorker.controller) {
          setUpdateAvailable(true)
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) {
            return
          }

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true)
            }
          })
        })
      })
      .catch((error) => {
        console.error('SW registration failed:', error)
      })
  }, [])

  const handleUpdate = useCallback(() => {
    const waiting = registration?.waiting
    if (!waiting) {
      setUpdateAvailable(false)
      return
    }

    waiting.postMessage({ type: SW_MSG_SKIP_WAITING })

    // 新しいService Workerが制御権を取得するまで待機
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        window.location.reload()
      },
      { once: true }
    )
  }, [registration])

  if (!updateAvailable) {
    return null
  }

  // sonner の mobileOffset と同じ判断で統一し、モバイルではタブバー 3.5rem + 余白 1rem と safe-area を避ける。
  // md 幅ではタブバーが無いため、standalone でも従来どおり 1rem + safe-area を確保する。
  return (
    <div className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 rounded-lg border border-border bg-card p-4 shadow-lg md:bottom-[calc(1rem+env(safe-area-inset-bottom))]">
      <p className="text-foreground text-sm">新しいバージョンが利用可能です</p>
      <Button className="mt-2" onClick={handleUpdate} type="button" variant="default">
        更新する
      </Button>
    </div>
  )
}
