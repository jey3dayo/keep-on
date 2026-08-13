'use client'

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { isAuthInterceptedResponse } from '@/lib/auth/access-intercept'

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

function clearIdentityState(setState: (state: IdentityState) => void): void {
  writeCachedUserId(null)
  setState({ isLoaded: true, userId: null })
}

function parseUserIdFromMePayload(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || !('userId' in data)) {
    return null
  }
  return typeof data.userId === 'string' && data.userId.length > 0 ? data.userId : null
}

async function resolveIdentityFromMeResponse(
  res: Response,
  setState: (state: IdentityState) => void,
  isCancelled: () => boolean
): Promise<void> {
  // 401 等、または Access が HTML/リダイレクトで差し替えた場合は未認証としてキャッシュ破棄
  if (!res.ok || isAuthInterceptedResponse(res)) {
    clearIdentityState(setState)
    return
  }

  try {
    const data: unknown = await res.json()
    if (isCancelled()) {
      return
    }
    const userId = parseUserIdFromMePayload(data)
    if (!userId) {
      clearIdentityState(setState)
      return
    }
    writeCachedUserId(userId)
    setState({ isLoaded: true, userId })
  } catch {
    if (isCancelled()) {
      return
    }
    // ok なのに JSON でない / 壊れている — オフライン扱いにせずキャッシュを捨てる
    clearIdentityState(setState)
  }
}

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<IdentityState>({ isLoaded: false, userId: null })

  useEffect(() => {
    let isCancelled = false
    const cancelled = () => isCancelled

    const load = async () => {
      let res: Response
      try {
        res = await fetch('/api/me', { cache: 'no-store' })
      } catch {
        if (isCancelled) {
          return
        }
        // 真のネットワーク失敗だけキャッシュ復元。Access 割り込みはここに来ない
        setState({ isLoaded: true, userId: readCachedUserId() })
        return
      }

      if (isCancelled) {
        return
      }

      await resolveIdentityFromMeResponse(res, setState, cancelled)
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
