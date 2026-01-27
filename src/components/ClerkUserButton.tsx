'use client'

import { UserButton } from '@clerk/nextjs'
import type { ComponentProps, ReactNode } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { isMissingClerkProviderError } from '@/lib/utils/clerk'

function ClerkUserButtonBoundary({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ErrorBoundary
      fallbackRender={({ error }) => {
        if (isMissingClerkProviderError(error)) {
          return fallback ?? null
        }
        throw error
      }}
      onError={(error) => {
        if (process.env.NODE_ENV !== 'production' && isMissingClerkProviderError(error)) {
          console.warn('ClerkProvider が見つからないため UserButton を表示できません。')
        }
      }}
    >
      {children}
    </ErrorBoundary>
  )
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
