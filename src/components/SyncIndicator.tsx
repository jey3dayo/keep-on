'use client'

import { CloudUpload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SYNC_INDICATOR_DELAY_MS, SYNC_INDICATOR_MIN_DISPLAY_MS } from '@/constants/sync'
import { useSyncContext } from '@/contexts/SyncContext'

export function SyncIndicator() {
  const { isSyncing } = useSyncContext()
  const [showSyncIcon, setShowSyncIcon] = useState(false)
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null)
  const minDisplayTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isDisplayingRef = useRef(false)

  useEffect(() => {
    if (isSyncing) {
      // 既存の最低表示時間タイマーをクリア
      if (minDisplayTimerRef.current) {
        clearTimeout(minDisplayTimerRef.current)
        minDisplayTimerRef.current = null
      }

      // 既存の遅延タイマーもクリア（短時間で開始→終了→再開始した場合）
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current)
        delayTimerRef.current = null
      }

      // 遅延してから同期アイコンを表示
      delayTimerRef.current = setTimeout(() => {
        setShowSyncIcon(true)
        isDisplayingRef.current = true
      }, SYNC_INDICATOR_DELAY_MS)
    } else {
      // 同期終了時
      if (delayTimerRef.current) {
        // まだ表示前なら表示をキャンセル
        clearTimeout(delayTimerRef.current)
        delayTimerRef.current = null
      }

      if (isDisplayingRef.current) {
        // 既に表示中の場合は最低表示時間を確保してから非表示
        minDisplayTimerRef.current = setTimeout(() => {
          setShowSyncIcon(false)
          isDisplayingRef.current = false
        }, SYNC_INDICATOR_MIN_DISPLAY_MS)
      }
    }

    return () => {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current)
      }
      if (minDisplayTimerRef.current) {
        clearTimeout(minDisplayTimerRef.current)
      }
    }
  }, [isSyncing])

  return (
    <div
      aria-atomic="true"
      aria-label={showSyncIcon ? '同期中' : '最新'}
      aria-live="polite"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/80"
      role="status"
    >
      {showSyncIcon && <CloudUpload className="h-5 w-5" />}
    </div>
  )
}
