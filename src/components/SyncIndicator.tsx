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
      aria-live="polite"
      className="flex h-5 w-5 items-center justify-center"
      title={isSyncing ? '同期中' : '同期完了'}
    >
      {isSyncing ? (
        <CloudUpload aria-label="同期中" className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <Check aria-label="同期完了" className="h-5 w-5 text-green-600 dark:text-green-400" />
      )}
    </div>
  )
}
