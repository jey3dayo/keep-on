'use client'

import { Check, CloudUpload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSyncContext } from '@/contexts/SyncContext'

export function SyncIndicator() {
  const { isSyncing } = useSyncContext()
  const [showCompleted, setShowCompleted] = useState(false)
  const [wasJustSyncing, setWasJustSyncing] = useState(false)

  useEffect(() => {
    if (isSyncing) {
      setWasJustSyncing(true)
      setShowCompleted(false)
      return
    }

    if (wasJustSyncing) {
      setShowCompleted(true)
      const timer = setTimeout(() => {
        setShowCompleted(false)
        setWasJustSyncing(false)
      }, 1500)

      return () => {
        clearTimeout(timer)
      }
    }
  }, [isSyncing, wasJustSyncing])

  if (!(isSyncing || showCompleted)) {
    return null
  }

  return (
    <div
      aria-atomic="true"
      aria-label={isSyncing ? '同期中' : '同期完了'}
      aria-live="polite"
      className="flex min-h-[44px] min-w-[44px] items-center justify-center"
      role="status"
      title={isSyncing ? '同期中' : '同期完了'}
    >
      <div
        className={`transition-all duration-200 ease-in-out ${showCompleted && !isSyncing ? 'fade-in zoom-in-95 animate-in' : ''}
          ${isSyncing ? 'motion-safe:animate-spin motion-reduce:animate-pulse' : ''}
        `}
      >
        {isSyncing ? (
          <CloudUpload className="h-5 w-5 text-muted-foreground" />
        ) : (
          <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
        )}
      </div>
    </div>
  )
}
