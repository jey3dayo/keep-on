'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex gap-2 rounded-lg bg-slate-200 p-1 dark:bg-slate-700">
        <button className="rounded-md px-3 py-1.5 text-sm" type="button">
          <span className="sr-only">テーマ読み込み中</span>
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2 rounded-lg bg-slate-200 p-1 dark:bg-slate-700">
      <button
        aria-label="ライトモードに切り替え"
        className={`rounded-md px-3 py-1.5 font-medium text-sm transition ${
          theme === 'light'
            ? 'bg-white text-slate-900 shadow dark:bg-slate-900 dark:text-white'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        }`}
        onClick={() => setTheme('light')}
        type="button"
      >
        ☀️ Light
      </button>
      <button
        aria-label="ダークモードに切り替え"
        className={`rounded-md px-3 py-1.5 font-medium text-sm transition ${
          theme === 'dark'
            ? 'bg-white text-slate-900 shadow dark:bg-slate-900 dark:text-white'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        }`}
        onClick={() => setTheme('dark')}
        type="button"
      >
        🌙 Dark
      </button>
      <button
        aria-label="システム設定に従う"
        className={`rounded-md px-3 py-1.5 font-medium text-sm transition ${
          theme === 'system'
            ? 'bg-white text-slate-900 shadow dark:bg-slate-900 dark:text-white'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        }`}
        onClick={() => setTheme('system')}
        type="button"
      >
        💻 System
      </button>
    </div>
  )
}
