import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'KeepOn',
  description: '習慣を継続するための習慣管理アプリ',
}

export default function Page() {
  redirect('/dashboard')
}
