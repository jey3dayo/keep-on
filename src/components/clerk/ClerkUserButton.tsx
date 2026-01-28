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
  const defaultAppearance = {
    elements: {
      userButtonAvatarBox: 'h-9 w-9',
      userButtonTrigger: 'h-9 w-9',
    },
  }

  const mergedAppearance = props.appearance
    ? {
        ...props.appearance,
        elements: {
          ...defaultAppearance.elements,
          ...props.appearance.elements,
        },
      }
    : defaultAppearance

  const resolvedFallback = fallback ?? <div aria-hidden="true" className="h-9 w-9 rounded-full bg-secondary" />

  return (
    <ClerkUserButtonBoundary fallback={resolvedFallback}>
      <div className="flex h-9 w-9 items-center justify-center">
        <UserButton {...props} appearance={mergedAppearance} />
      </div>
    </ClerkUserButtonBoundary>
  )
}
