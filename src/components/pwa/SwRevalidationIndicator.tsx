'use client'

import { useSwRevalidation } from '@/hooks/useSwRevalidation'

export function SwRevalidationIndicator() {
  const { isStale } = useSwRevalidation()

  if (!isStale) {
    return null
  }

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed top-[calc(1rem+env(safe-area-inset-top))] left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full border border-border bg-card px-3 py-1.5 text-muted-foreground text-xs shadow-sm"
      role="status"
    >
      最新の状態に更新中…
    </div>
  )
}
