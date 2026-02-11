'use client'

import { createContext, useContext, useRef, useState } from 'react'

interface SyncContextValue {
  pendingCount: number
  startSync: (id: string) => void
  endSync: (id: string) => void
  isSyncing: boolean
}

const SyncContext = createContext<SyncContextValue | null>(null)

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0)
  const pendingCountsRef = useRef<Map<string, number>>(new Map())

  const startSync = (id: string) => {
    const current = pendingCountsRef.current.get(id) ?? 0
    pendingCountsRef.current.set(id, current + 1)

    // 全体のカウントを計算
    let total = 0
    for (const count of pendingCountsRef.current.values()) {
      total += count
    }
    setPendingCount(total)
  }

  const endSync = (id: string) => {
    const current = pendingCountsRef.current.get(id) ?? 0
    if (current <= 1) {
      pendingCountsRef.current.delete(id)
    } else {
      pendingCountsRef.current.set(id, current - 1)
    }

    // 全体のカウントを計算
    let total = 0
    for (const count of pendingCountsRef.current.values()) {
      total += count
    }
    setPendingCount(total)
  }

  const isSyncing = pendingCount > 0

  return <SyncContext.Provider value={{ pendingCount, startSync, endSync, isSyncing }}>{children}</SyncContext.Provider>
}

export function useSyncContext() {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error('useSyncContext must be used within SyncProvider')
  }
  return context
}
