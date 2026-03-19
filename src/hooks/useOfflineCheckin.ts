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

  // オンライン復帰時にキューを replay（Background Sync 非対応ブラウザのフォールバック）
  useEffect(() => {
    if (!isOnline) {
      return
    }

    // Background Sync 対応ブラウザでは SW が replay するため、hook での replay をスキップ
    if (hasBgSync()) {
      return
    }

    replayQueue().then((result) => {
      if (result.replayed > 0 || result.failed > 0) {
        onReplayCompleteRef.current?.(result)
      }
    })
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
        try {
          const reg = await navigator.serviceWorker.ready
          await (reg as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register(
            'sync-checkins'
          )
        } catch {
          // sync.register() 失敗時（BgSync 無効・登録拒否等）はフォールバック replay
          // オンライン状態なら即座に replay を試行
          if (navigator.onLine) {
            replayQueue().then((result) => {
              if (result.replayed > 0 || result.failed > 0) {
                onReplayCompleteRef.current?.(result)
              }
            })
          }
        }
      }
    },
    []
  )

  return { isOnline, enqueueCheckin }
}
