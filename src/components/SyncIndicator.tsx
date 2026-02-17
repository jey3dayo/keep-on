'use client'

import { CheckCircle2, CloudUpload } from 'lucide-react'
import { useSyncContext } from '@/contexts/SyncContext'

export function SyncIndicator() {
  const { isSyncing } = useSyncContext()

  return (
    <div
      aria-atomic="true"
      aria-label={isSyncing ? '同期中' : '最新'}
      aria-live="polite"
      className="flex min-h-[44px] min-w-[44px] items-center justify-center"
      role="status"
      title={isSyncing ? '同期中' : '最新'}
    >
      {isSyncing ? (
        <CloudUpload className="h-5 w-5 text-muted-foreground" />
      ) : (
        <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  )
}
