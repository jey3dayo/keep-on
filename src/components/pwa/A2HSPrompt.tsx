'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const IOS_REGEX = /iPad|iPhone|iPod/

export function A2HSPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // 既にPWAとして起動している場合は非表示
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return
    }
    // 既に非表示設定済み
    if (localStorage.getItem('a2hs-dismissed') === 'true') {
      return
    }

    // Chrome/Edge向け beforeinstallprompt
    const handlePrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handlePrompt)

    // iOS Safari判定
    const isIOS = IOS_REGEX.test(navigator.userAgent)
    const isStandalone = 'standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone
    if (isIOS && !isStandalone) {
      setShowIOSPrompt(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handlePrompt)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return
    }
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('a2hs-dismissed', 'true')
  }

  if (dismissed) {
    return null
  }

  // Android/Chrome向けプロンプト
  if (deferredPrompt) {
    return (
      <div className="fixed right-4 bottom-4 left-4 z-50 rounded-lg border border-border bg-card p-4 shadow-lg sm:left-auto sm:w-80">
        <button
          aria-label="閉じる"
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="pr-6 font-medium text-foreground text-sm">ホーム画面に追加</p>
        <p className="mt-1 text-muted-foreground text-xs">アプリのようにすぐアクセスできます</p>
        <button
          className="mt-3 w-full rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm hover:bg-primary/90"
          onClick={handleInstall}
          type="button"
        >
          インストール
        </button>
      </div>
    )
  }

  // iOS Safari向けプロンプト
  if (showIOSPrompt) {
    return (
      <div className="fixed right-4 bottom-4 left-4 z-50 rounded-lg border border-border bg-card p-4 shadow-lg sm:left-auto sm:w-80">
        <button
          aria-label="閉じる"
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="pr-6 font-medium text-foreground text-sm">ホーム画面に追加</p>
        <p className="mt-2 text-muted-foreground text-xs">
          <span className="inline-flex items-center gap-1">
            <span>1. 下部の</span>
            <span className="inline-block rounded bg-muted px-1">共有</span>
            <span>ボタンをタップ</span>
          </span>
          <br />
          <span>2. 「ホーム画面に追加」を選択</span>
        </p>
      </div>
    )
  }

  return null
}
