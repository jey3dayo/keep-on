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
  const pendingIdsRef = useRef<Set<string>>(new Set())

  const startSync = (id: string) => {
    if (pendingIdsRef.current.has(id)) {
      return
    }
    pendingIdsRef.current.add(id)
    setPendingCount(pendingIdsRef.current.size)
  }

  const endSync = (id: string) => {
    pendingIdsRef.current.delete(id)
    setPendingCount(pendingIdsRef.current.size)
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
