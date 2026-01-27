'use client'

import { UserButton } from '@clerk/nextjs'
import type { ComponentProps, ReactNode } from 'react'
import React from 'react'
import { isMissingClerkProviderError } from '@/lib/utils/clerk'

class ClerkUserButtonBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  { error: Error | null }
> {
  state = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    if (process.env.NODE_ENV !== 'production' && isMissingClerkProviderError(error)) {
      console.warn('ClerkProvider が見つからないため UserButton を表示できません。')
    }
  }

  render() {
    const { error } = this.state
    if (error) {
      if (isMissingClerkProviderError(error)) {
        return this.props.fallback ?? null
      }
      throw error
    }

    return this.props.children
  }
}

type ClerkUserButtonProps = ComponentProps<typeof UserButton> & {
  fallback?: ReactNode
}

export function ClerkUserButton({ fallback, ...props }: ClerkUserButtonProps) {
  return (
    <ClerkUserButtonBoundary fallback={fallback}>
      <UserButton {...props} />
    </ClerkUserButtonBoundary>
  )
}
