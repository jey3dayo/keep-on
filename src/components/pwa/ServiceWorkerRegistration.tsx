'use client'

import { useEffect, useState } from 'react'

export function ServiceWorkerRegistration() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
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
      <button
        className="mt-2 rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm hover:bg-primary/90"
        onClick={handleUpdate}
        type="button"
      >
        更新する
      </button>
    </div>
  )
}
