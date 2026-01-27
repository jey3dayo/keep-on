'use client'

import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import { useEffect } from 'react'
import { DEFAULT_THEME_MODE, THEME_MODE_COOKIE_KEY } from '@/constants/theme'
import { setClientCookie } from '@/lib/utils/cookies'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

function ThemeCookieSync() {
  const { theme } = useTheme()

  useEffect(() => {
    if (!theme) {
      return
    }

    setClientCookie(THEME_MODE_COOKIE_KEY, theme, {
      maxAge: COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
    })
  }, [theme])

  return null
}

export function ThemeProvider({ children, defaultTheme }: { children: React.ReactNode; defaultTheme?: string }) {
  const nextDefaultTheme = defaultTheme ?? DEFAULT_THEME_MODE
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={nextDefaultTheme}
      disableTransitionOnChange
      enableSystem
      storageKey={THEME_MODE_COOKIE_KEY}
    >
      <ThemeCookieSync />
      {children}
    </NextThemesProvider>
  )
}
