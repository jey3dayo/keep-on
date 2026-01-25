'use client'

import { useEffect, useState } from 'react'

export type ThemeName = 'lime' | 'orange' | 'red' | 'pink' | 'purple' | 'blue' | 'cyan' | 'yellow'

interface UseColorTheme {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
}

const STORAGE_KEY = 'color-theme'
const DEFAULT_THEME: ThemeName = 'lime'

export function useColorTheme(): UseColorTheme {
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeName | null
    if (stored && isValidTheme(stored)) {
      setThemeState(stored)
      applyTheme(stored)
    }
  }, [])

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEY, newTheme)
    applyTheme(newTheme)
  }

  return { theme, setTheme }
}

function isValidTheme(value: string): value is ThemeName {
  const themes: ThemeName[] = ['lime', 'orange', 'red', 'pink', 'purple', 'blue', 'cyan', 'yellow']
  return themes.includes(value as ThemeName)
}

function applyTheme(theme: ThemeName) {
  document.documentElement.setAttribute('data-theme', theme)
}
