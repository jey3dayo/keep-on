import { SignIn } from '@clerk/nextjs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'サインイン - KeepOn',
  description: 'KeepOnにサインインして習慣トラッキングを始めましょう',
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <SignIn />
    </div>
  )
}
