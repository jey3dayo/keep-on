'use client'

import { useCallback, useEffect } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import {
  enqueueOfflineCheckin,
  getAllQueuedCheckins,
  type QueuedCheckin,
  removeQueuedCheckin,
} from '@/lib/pwa/offline-queue'

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

interface ReplayResult {
  failed: number
  replayed: number
}

const replayQueue = async (): Promise<ReplayResult> => {
  let replayed = 0
  let failed = 0

  const items = await getAllQueuedCheckins()
  if (items.length === 0) {
    return { replayed: 0, failed: 0 }
  }

  // タイムスタンプ順に処理
  const sorted = [...items].sort((a, b) => a.timestamp - b.timestamp)

  for (const item of sorted) {
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId: item.habitId, action: item.action, dateKey: item.dateKey }),
      })
      if (res.ok) {
        await removeQueuedCheckin(item.id)
        replayed++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }

  return { replayed, failed }
}

interface UseOfflineCheckinOptions {
  onReplayComplete?: (result: ReplayResult) => void
}

export function useOfflineCheckin(options: UseOfflineCheckinOptions = {}) {
  const isOnline = useOnlineStatus()
  const { onReplayComplete } = options

  // オンライン復帰時にキューを replay（Safari/iOS フォールバック）
  useEffect(() => {
    if (!isOnline) {
      return
    }

    replayQueue().then((result) => {
      if (result.replayed > 0 || result.failed > 0) {
        onReplayComplete?.(result)
      }
    })
  }, [isOnline, onReplayComplete])

  const enqueueCheckin = useCallback(
    async (habitId: string, action: 'add' | 'remove', dateKey: string): Promise<void> => {
      const item: QueuedCheckin = {
        id: generateId(),
        habitId,
        action,
        dateKey,
        timestamp: Date.now(),
      }
      await enqueueOfflineCheckin(item)

      // Background Sync が利用可能ならキューを SW に委譲
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const reg = await navigator.serviceWorker.ready
        await (reg as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-checkins')
      }
    },
    []
  )

  return { isOnline, enqueueCheckin }
}
