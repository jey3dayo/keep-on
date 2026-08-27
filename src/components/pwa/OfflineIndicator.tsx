'use client'

import { useEffect, useRef, useState } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

const SURFACE_EXIT_MS = 200

export function OfflineIndicator() {
  const isOnline = useOnlineStatus()
  const [shouldRender, setShouldRender] = useState(false)
  const [entered, setEntered] = useState(false)
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current)
      exitTimerRef.current = null
    }

    if (!isOnline) {
      setShouldRender(true)
      const frame = requestAnimationFrame(() => {
        setEntered(true)
      })
      return () => cancelAnimationFrame(frame)
    }

    setEntered(false)
    exitTimerRef.current = setTimeout(() => {
      setShouldRender(false)
      exitTimerRef.current = null
    }, SURFACE_EXIT_MS)
  }, [isOnline])

  useEffect(
    () => () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current)
      }
    },
    []
  )

  if (!shouldRender) {
    return null
  }

  return (
    <div
      aria-live="polite"
      className="surface-from-top fixed top-[calc(var(--header-height)+env(safe-area-inset-top))] right-0 left-0 z-50 bg-yellow-500 px-4 py-2 text-center font-medium text-black text-sm"
      data-entered={entered ? 'true' : undefined}
      role="status"
    >
      オフラインです。接続が回復すると自動的に同期されます。
    </div>
  )
}
