'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

let LazyAgentationToolbar: ComponentType = () => null

if (process.env.NODE_ENV !== 'production') {
  LazyAgentationToolbar = dynamic(
    () => import('@/components/dev/AgentationToolbar').then((mod) => mod.AgentationToolbar),
    { ssr: false }
  )
}

export function DevAgentationToolbar() {
  return <LazyAgentationToolbar />
}
