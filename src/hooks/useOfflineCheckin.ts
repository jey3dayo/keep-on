'use client'

import { useAuth } from '@clerk/nextjs'
import { useCallback, useEffect, useRef } from 'react'
import { SW_MSG_SYNC_COMPLETE, SW_SYNC_TAG } from '@/constants/pwa'
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
    await reg.sync.register(SW_SYNC_TAG)
    return true
  } catch {
    return false
  }
}

/**
 * Cloudflare Access のセッション切れ時、fetch にはログインページの HTML が 200(既定で redirect を follow した最終形)で返る。
 * res.ok=true のケースに限定して判定する: redirect または非 JSON レスポンスなら Access の割り込みとみなす。
 * (4xx/5xx の HTML はステータス分類側で既にリトライ判定されるため、ここでは扱わない)
 */
const isAuthInterceptedResponse = (res: Response): boolean => {
  if (res.redirected) {
    return true
  }
  const contentType = res.headers.get('content-type')
  return !contentType?.includes('application/json')
}

/** userId を持たない旧アイテム・別ユーザーのアイテムは照合不能なので replay せず破棄する */
const discardUnverifiableItems = async (items: QueuedCheckin[], currentUserId: string): Promise<QueuedCheckin[]> => {
  const verified: QueuedCheckin[] = []
  for (const item of items) {
    if (item.userId === currentUserId) {
      verified.push(item)
    } else {
      console.warn('[offline-queue] discarding checkin that does not belong to the current user', item.id)
      await removeQueuedCheckin(item.id).catch(() => undefined)
    }
  }
  return verified
}

const replayQueue = async (currentUserId: string, prefetchedItems?: QueuedCheckin[]): Promise<ReplayResult> => {
  let replayed = 0
  let failed = 0

  const allItems = prefetchedItems ?? (await getAllQueuedCheckins())
  const items = await discardUnverifiableItems(allItems, currentUserId)
  if (items.length === 0) {
    return { failed: 0, replayed: 0 }
  }

  // タイムスタンプ順に処理
  const sorted = [...items].sort((a, b) => a.timestamp - b.timestamp)

  for (const item of sorted) {
    try {
      const res = await fetch('/api/checkin', {
        body: JSON.stringify({
          action: item.action,
          dateKey: item.dateKey,
          habitId: item.habitId,
          userId: item.userId,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (res.ok && isAuthInterceptedResponse(res)) {
        // ok(2xx) だが Access のログイン画面等に差し替えられている可能性がある。401/403 と同様にリトライ対象として残す
        failed++
        break
      }
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

  return { failed, replayed }
}

interface UseOfflineCheckinOptions {
  onReplayComplete?: (result: ReplayResult) => void
}

export function useOfflineCheckin(options: UseOfflineCheckinOptions = {}) {
  const isOnline = useOnlineStatus()
  const { isLoaded, userId } = useAuth()

  // enqueue callback の identity を保ったまま最新の userId を読むため ref 経由にする
  const userIdRef = useRef(userId)
  userIdRef.current = userId

  // onReplayComplete を useRef で安定化（インラインオブジェクトによる useEffect 再実行を防止）
  const onReplayCompleteRef = useRef(options.onReplayComplete)
  onReplayCompleteRef.current = options.onReplayComplete

  // Background Sync 対応ブラウザ: SW からの SYNC_CHECKINS_COMPLETE メッセージを受信
  useEffect(() => {
    if (!hasBgSync()) {
      return
    }

    const handler = (event: MessageEvent) => {
      if (event.data?.type === SW_MSG_SYNC_COMPLETE) {
        onReplayCompleteRef.current?.({ failed: 0, replayed: event.data.replayedCount ?? 0 })
      }
    }

    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [])

  // オンライン復帰時は BgSync を再登録し、失敗した場合だけ hook 側で replay する
  useEffect(() => {
    // userId が確定するまでは照合できないため replay しない
    if (!(isOnline && isLoaded && userId)) {
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

      const result = await replayQueue(userId, queuedItems)
      if (!isCancelled && (result.replayed > 0 || result.failed > 0)) {
        onReplayCompleteRef.current?.(result)
      }
    }

    handleReconnect().catch(() => undefined)

    return () => {
      isCancelled = true
    }
  }, [isLoaded, isOnline, userId])

  const enqueueCheckin = useCallback(
    async (habitId: string, action: 'add' | 'remove', dateKey: string): Promise<void> => {
      const currentUserId = userIdRef.current
      // 未サインインのチェックインはそもそも成功しないため、照合不能なアイテムを積まずに捨てる
      if (!currentUserId) {
        return
      }

      const item: QueuedCheckin = {
        action,
        dateKey,
        habitId,
        id: generateId(),
        timestamp: Date.now(),
        userId: currentUserId,
      }
      await enqueueOfflineCheckin(item)

      // Background Sync が利用可能ならキューを SW に委譲
      // replay は isOnline effect 側で一元管理（重複実行を回避）
      await registerBackgroundSync()
    },
    []
  )

  return { enqueueCheckin, isOnline }
}
