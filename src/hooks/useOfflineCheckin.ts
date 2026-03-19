'use client'

import { useCallback, useEffect, useRef } from 'react'
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

const hasBgSync = () => 'serviceWorker' in navigator && 'SyncManager' in window

const registerBackgroundSync = async (): Promise<boolean> => {
  if (!hasBgSync()) {
    return false
  }

  try {
    const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> }
    }
    if (!reg.sync) {
      return false
    }
    await reg.sync.register('sync-checkins')
    return true
  } catch {
    return false
  }
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
      } else if (res.status === 401 || res.status === 403) {
        failed++
        break
      } else if (res.status >= 400 && res.status < 500) {
        await removeQueuedCheckin(item.id)
        failed++
      } else {
        failed++
        break
      }
    } catch {
      failed++
      break
    }
  }

  return { replayed, failed }
}

interface UseOfflineCheckinOptions {
  onReplayComplete?: (result: ReplayResult) => void
}

export function useOfflineCheckin(options: UseOfflineCheckinOptions = {}) {
  const isOnline = useOnlineStatus()

  // onReplayComplete を useRef で安定化（インラインオブジェクトによる useEffect 再実行を防止）
  const onReplayCompleteRef = useRef(options.onReplayComplete)
  onReplayCompleteRef.current = options.onReplayComplete

  // Background Sync 対応ブラウザ: SW からの SYNC_CHECKINS_COMPLETE メッセージを受信
  useEffect(() => {
    if (!hasBgSync()) {
      return
    }

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_CHECKINS_COMPLETE') {
        onReplayCompleteRef.current?.({ replayed: event.data.replayedCount ?? 0, failed: 0 })
      }
    }

    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [])

  // オンライン復帰時は BgSync を再登録し、失敗した場合だけ hook 側で replay する
  useEffect(() => {
    if (!isOnline) {
      return
    }

    let isCancelled = false

    const handleReconnect = async () => {
      const queuedItems = await getAllQueuedCheckins()
      if (queuedItems.length === 0) {
        return
      }

      if (await registerBackgroundSync()) {
        return
      }

      const result = await replayQueue()
      if (!isCancelled && (result.replayed > 0 || result.failed > 0)) {
        onReplayCompleteRef.current?.(result)
      }
    }

    handleReconnect().catch(() => undefined)

    return () => {
      isCancelled = true
    }
  }, [isOnline])

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
      if (hasBgSync()) {
        const registered = await registerBackgroundSync()
        if (!registered && navigator.onLine) {
          const result = await replayQueue()
          if (result.replayed > 0 || result.failed > 0) {
            onReplayCompleteRef.current?.(result)
          }
        }
      }
    },
    []
  )

  return { isOnline, enqueueCheckin }
}
