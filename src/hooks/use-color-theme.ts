'use client'

import { useEffect, useState } from 'react'
import { COLOR_THEME_COOKIE_KEY, type ColorThemeName, DEFAULT_COLOR_THEME, isColorTheme } from '@/constants/theme'
import { getClientCookie, setClientCookie } from '@/lib/utils/cookies'

interface UseColorTheme {
  theme: ColorThemeName
  setTheme: (theme: ColorThemeName) => void
  ready: boolean
}

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/**
 * カラーテーマフック
 *
 * Note: このフックは後方互換性のために Cookie/localStorage ベースで動作しています。
 * 将来的には useUserSettings を使用してDB同期を実装予定です。
 */
export function useColorTheme(initialTheme?: ColorThemeName): UseColorTheme {
  const [theme, setThemeState] = useState<ColorThemeName | null>(initialTheme ?? null)

  useEffect(() => {
    const cookieTheme = getClientCookie(COLOR_THEME_COOKIE_KEY)
    const nextFromCookie = cookieTheme && isColorTheme(cookieTheme) ? cookieTheme : null
    const nextFromStorage = getThemeFromStorage()
    const next = nextFromCookie ?? nextFromStorage ?? initialTheme ?? DEFAULT_COLOR_THEME

    setThemeState(next)
    applyTheme(next)

    if (nextFromCookie !== next) {
      persistTheme(next)
    }
  }, [initialTheme])

  const setTheme = (newTheme: ColorThemeName) => {
    setThemeState(newTheme)
    persistTheme(newTheme)
    applyTheme(newTheme)
  }

  return { theme: theme ?? initialTheme ?? DEFAULT_COLOR_THEME, setTheme, ready: theme !== null }
}

function getThemeFromStorage(): ColorThemeName | null {
  if (typeof localStorage === 'undefined') {
    return null
  }

  const stored = localStorage.getItem(COLOR_THEME_COOKIE_KEY)
  return stored && isColorTheme(stored) ? stored : null
}

function persistTheme(theme: ColorThemeName) {
  setClientCookie(COLOR_THEME_COOKIE_KEY, theme, {
    maxAge: COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
  })

  try {
    localStorage.setItem(COLOR_THEME_COOKIE_KEY, theme)
  } catch {
    // ignore storage errors
  }
}

function applyTheme(theme: ColorThemeName) {
  document.documentElement.setAttribute('data-theme', theme)
}
