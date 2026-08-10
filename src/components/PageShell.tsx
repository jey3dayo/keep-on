import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageShellProps {
  children: ReactNode
  className?: string
  gap?: string
}

// layout.tsx ではなくページ側の opt-in にしているのは、
// dashboard ページがコンテナ className を持たないフルブリード表示のため
// （layout に padding を足すと dashboard の背景が壊れる）
export function PageShell({ children, className, gap = 'gap-6' }: PageShellProps) {
  return <div className={cn('flex flex-1 flex-col p-4 md:p-6', gap, className)}>{children}</div>
}
