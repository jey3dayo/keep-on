'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/basics/Button'

export function ServiceWorkerRegistration() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

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

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })

      // 新しいService Workerが制御権を取得するまで待機
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
    }
  }

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
