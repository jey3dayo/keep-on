'use client'

import { useAuth } from '@clerk/nextjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/basics/Button'
import { SW_MSG_CLEAR_USER_CACHE, SW_MSG_SKIP_WAITING } from '@/constants/pwa'

export function ServiceWorkerRegistration() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const { isSignedIn, userId } = useAuth()
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
        navigator.serviceWorker?.controller?.postMessage({ type: SW_MSG_CLEAR_USER_CACHE })
      }
      return
    }

    // isSignedIn が undefined（Clerk 読み込み中）の間は判定を保留する
    if (isSignedIn !== false || !prev) {
      return
    }

    previousUserId.current = null
    navigator.serviceWorker?.controller?.postMessage({ type: SW_MSG_CLEAR_USER_CACHE })
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
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: SW_MSG_SKIP_WAITING })

      // 新しいService Workerが制御権を取得するまで待機
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
    }
  }, [registration])

  if (!updateAvailable) {
    return null
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 rounded-lg border border-border bg-card p-4 shadow-lg">
      <p className="text-foreground text-sm">新しいバージョンが利用可能です</p>
      <Button className="mt-2" onClick={handleUpdate} type="button" variant="default">
        更新する
      </Button>
    </div>
  )
}
