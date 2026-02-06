'use client'

import dynamic from 'next/dynamic'

const AgentationToolbar = dynamic(
  () => import('@/components/dev/AgentationToolbar').then((mod) => mod.AgentationToolbar),
  { ssr: false }
)

export function DevAgentationToolbar() {
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  return <AgentationToolbar />
}
