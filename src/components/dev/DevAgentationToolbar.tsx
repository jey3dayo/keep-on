'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

const LazyAgentationToolbar: ComponentType =
  process.env.NODE_ENV === 'production'
    ? () => null
    : dynamic(() => import('@/components/dev/AgentationToolbar').then((mod) => mod.AgentationToolbar), { ssr: false })

export function DevAgentationToolbar() {
  return <LazyAgentationToolbar />
}
