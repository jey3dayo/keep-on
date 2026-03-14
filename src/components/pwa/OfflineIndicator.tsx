'use client'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function OfflineIndicator() {
  const isOnline = useOnlineStatus()

  if (isOnline) {
    return null
  }

  return (
    <div className="fixed top-0 right-0 left-0 z-50 bg-yellow-500 px-4 py-2 text-center font-medium text-sm text-white">
      オフラインです。接続が回復すると自動的に同期されます。
    </div>
  )
}
