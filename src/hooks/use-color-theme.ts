'use client'

import { useEffect, useState } from 'react'

export type ThemeName = 'lime' | 'orange' | 'red' | 'pink' | 'purple' | 'blue' | 'cyan' | 'yellow'

interface UseColorTheme {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
  ready: boolean
}

const STORAGE_KEY = 'color-theme'
const DEFAULT_THEME: ThemeName = 'lime'

export function useColorTheme(): UseColorTheme {
  const [theme, setThemeState] = useState<ThemeName | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const next = stored && isValidTheme(stored) ? stored : DEFAULT_THEME
    setThemeState(next)
    applyTheme(next)
  }, [])

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEY, newTheme)
    applyTheme(newTheme)
  }

  return { theme: theme ?? DEFAULT_THEME, setTheme, ready: theme !== null }
}

function isValidTheme(value: string): value is ThemeName {
  const themes: ThemeName[] = ['lime', 'orange', 'red', 'pink', 'purple', 'blue', 'cyan', 'yellow']
  return themes.includes(value as ThemeName)
}

function applyTheme(theme: ThemeName) {
  document.documentElement.setAttribute('data-theme', theme)
}
