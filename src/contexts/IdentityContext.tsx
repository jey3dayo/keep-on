'use client'

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'

const IDENTITY_STORAGE_KEY = 'ko_identity'

interface IdentityState {
  isLoaded: boolean
  userId: string | null
}

const IdentityContext = createContext<IdentityState | undefined>(undefined)

function readCachedUserId(): string | null {
  try {
    return localStorage.getItem(IDENTITY_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeCachedUserId(userId: string | null): void {
  try {
    if (userId) {
      localStorage.setItem(IDENTITY_STORAGE_KEY, userId)
    } else {
      localStorage.removeItem(IDENTITY_STORAGE_KEY)
    }
  } catch {
    // localStorage が使えない環境（プライベートモード等）では単純に諦める
  }
}

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<IdentityState>({ isLoaded: false, userId: null })

  useEffect(() => {
    let isCancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' })
        if (!res.ok) {
          if (isCancelled) {
            return
          }
          // 未認証と判明した場合はキャッシュも破棄する
          writeCachedUserId(null)
          setState({ isLoaded: true, userId: null })
          return
        }

        const data = (await res.json()) as { userId: string }
        if (isCancelled) {
          return
        }
        writeCachedUserId(data.userId)
        setState({ isLoaded: true, userId: data.userId })
      } catch {
        if (isCancelled) {
          return
        }
        // オフライン等で fetch 自体に失敗した場合はキャッシュされた値で復元する
        const cached = readCachedUserId()
        setState({ isLoaded: true, userId: cached })
      }
    }

    load()

    return () => {
      isCancelled = true
    }
  }, [])

  const value = useMemo(() => state, [state])

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>
}

export function useIdentity(): IdentityState {
  const context = useContext(IdentityContext)
  if (!context) {
    throw new Error('useIdentity must be used within an IdentityProvider')
  }
  return context
}
