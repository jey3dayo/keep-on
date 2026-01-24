'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Icon } from './Icon'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // ハイドレーションエラーを防ぐため、マウント後にのみレンダリング
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div aria-hidden="true" className="h-10 w-10 animate-pulse rounded-full bg-secondary" />
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      aria-label={`${isDark ? 'ライト' : 'ダーク'}モードに切り替え`}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-all hover:bg-secondary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      type="button"
    >
      {isDark ? <Icon name="sun" size={20} /> : <Icon name="moon" size={20} />}
    </button>
  )
}
