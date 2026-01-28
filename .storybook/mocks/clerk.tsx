import type { ReactNode } from 'react'

interface ClerkUser {
  id: string
  emailAddresses: Array<{ emailAddress: string }>
}

export function ClerkProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function UserButton() {
  return <button type="button">User</button>
}

export function SignIn() {
  return <div>SignIn</div>
}

export function SignUp() {
  return <div>SignUp</div>
}

export function SignedIn({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function SignedOut() {
  return null
}

export function ClerkLoaded({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function ClerkLoading() {
  return null
}

export function isClerkAPIResponseError(_error: unknown): boolean {
  return false
}

export function currentUser(): Promise<ClerkUser | null> {
  return Promise.resolve({
    id: 'storybook-user',
    emailAddresses: [{ emailAddress: 'storybook@example.com' }],
  })
}

export function auth() {
  return Promise.resolve({ userId: 'storybook-user' })
}
