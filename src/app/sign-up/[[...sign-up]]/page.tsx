import { SignUp } from '@clerk/nextjs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  description: 'KeepOnに新規登録して習慣トラッキングを始めましょう',
  title: '新規登録 - KeepOn',
}

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <SignUp />
    </div>
  )
}
