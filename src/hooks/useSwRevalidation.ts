'use client'

import { usePathname, useRouter } from 'next/navigation'
import { startTransition, useCallback, useEffect, useRef, useState } from 'react'
import { SW_MSG_NAV_AUTH_LOST, SW_MSG_NAV_REVALIDATED, SW_MSG_NAV_STALE_SERVED } from '@/constants/pwa'
import { useSyncContext } from '@/contexts/SyncContext'

const REVALIDATION_DEBOUNCE_MS = 500
const REVALIDATION_FALLBACK_MS = 5000

interface ServiceWorkerMessage {
  path?: string
  type: string
}

const isServiceWorkerMessage = (data: unknown): data is ServiceWorkerMessage =>
  typeof data === 'object' && data !== null && 'type' in data && typeof data.type === 'string'

const isCurrentPathMessage = (data: ServiceWorkerMessage, pathname: string) =>
  typeof data.path === 'string' && data.path === pathname

export function useSwRevalidation() {
  const pathname = usePathname()
  const router = useRouter()
  const { pendingCount } = useSyncContext()
  const [isStale, setIsStale] = useState(false)
  const pathnameRef = useRef(pathname)
  const routerRef = useRef(router)
  const pendingCountRef = useRef(pendingCount)
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshRequestedRef = useRef(false)

  pathnameRef.current = pathname
  routerRef.current = router
  pendingCountRef.current = pendingCount

  const runGuardedRefresh = useCallback(() => {
    if (!refreshRequestedRef.current || pendingCountRef.current > 0) {
      return
    }

    refreshRequestedRef.current = false
    startTransition(() => {
      routerRef.current.refresh()
      setIsStale(false)
    })
  }, [])

  const scheduleRefresh = useCallback(() => {
    refreshRequestedRef.current = true
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
    refreshTimeoutRef.current = setTimeout(() => {
      refreshTimeoutRef.current = null
      runGuardedRefresh()
    }, REVALIDATION_DEBOUNCE_MS)
  }, [runGuardedRefresh])

  useEffect(() => {
    if (pendingCount === 0 && refreshRequestedRef.current && refreshTimeoutRef.current === null) {
      runGuardedRefresh()
    }
  }, [pendingCount, runGuardedRefresh])

  useEffect(() => {
    if (!('serviceWorker' in navigator && navigator.serviceWorker)) {
      return
    }

    const serviceWorker = navigator.serviceWorker
    const clearFallbackTimer = () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current)
        fallbackTimeoutRef.current = null
      }
    }
    const handler = (event: MessageEvent<unknown>) => {
      if (!isServiceWorkerMessage(event.data)) {
        return
      }

      if (event.data.type === SW_MSG_NAV_STALE_SERVED && !isCurrentPathMessage(event.data, pathnameRef.current)) {
        return
      }

      if (event.data.type === SW_MSG_NAV_STALE_SERVED) {
        setIsStale(true)
        clearFallbackTimer()
        fallbackTimeoutRef.current = setTimeout(() => {
          fallbackTimeoutRef.current = null
          refreshRequestedRef.current = true
          runGuardedRefresh()
        }, REVALIDATION_FALLBACK_MS)
        return
      }

      if (event.data.type === SW_MSG_NAV_REVALIDATED && !isCurrentPathMessage(event.data, pathnameRef.current)) {
        return
      }

      if (event.data.type === SW_MSG_NAV_REVALIDATED) {
        clearFallbackTimer()
        scheduleRefresh()
        return
      }

      if (event.data.type === SW_MSG_NAV_AUTH_LOST) {
        window.location.reload()
      }
    }

    serviceWorker.addEventListener('message', handler)

    return () => {
      serviceWorker.removeEventListener('message', handler)
      clearFallbackTimer()
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
    }
  }, [runGuardedRefresh, scheduleRefresh])

  return { isStale }
}
