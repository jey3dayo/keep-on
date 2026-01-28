import type { ReactNode } from 'react'

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
