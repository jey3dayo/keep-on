'use client'

import type React from 'react'
import { SyncProvider } from '@/contexts/SyncContext'

export function SyncProviderWrapper({ children }: { children: React.ReactNode }) {
  return <SyncProvider>{children}</SyncProvider>
}
