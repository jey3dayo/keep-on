import { SignUp } from '@clerk/nextjs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '新規登録 - KeepOn',
  description: 'KeepOnに新規登録して習慣トラッキングを始めましょう',
}

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <SignUp />
    </div>
  )
}
