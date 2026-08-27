import { createContext, type ReactNode, type SetStateAction, useContext, useEffect, useMemo, useState } from 'react'

type ThemeAttribute = string | string[]
type ThemeValues = Record<string, string>

interface ThemeProviderProps {
  attribute?: ThemeAttribute
  children: ReactNode
  defaultTheme?: string
  disableTransitionOnChange?: boolean
  enableColorScheme?: boolean
  enableSystem?: boolean
  forcedTheme?: string
  nonce?: string
  scriptProps?: Record<string, unknown>
  storageKey?: string
  themes?: string[]
  value?: ThemeValues
}

interface ThemeContextValue {
  forcedTheme?: string
  resolvedTheme?: string
  setTheme: (theme: SetStateAction<string>) => void
  systemTheme?: string
  theme?: string
  themes: string[]
}

const defaultThemeContext: ThemeContextValue = {
  resolvedTheme: undefined,
  setTheme: () => undefined,
  systemTheme: undefined,
  theme: undefined,
  themes: [],
}

const ThemeContext = createContext<ThemeContextValue>(defaultThemeContext)

function getSystemTheme() {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme(storageKey: string, defaultTheme: string) {
  if (typeof window === 'undefined') {
    return defaultTheme
  }

  try {
    return window.localStorage.getItem(storageKey) ?? defaultTheme
  } catch {
    return defaultTheme
  }
}

function applyTheme({
  attribute,
  enableColorScheme,
  resolvedTheme,
  themes,
  value,
}: {
  attribute: ThemeAttribute
  enableColorScheme: boolean
  resolvedTheme?: string
  themes: string[]
  value?: ThemeValues
}) {
  if (typeof document === 'undefined') {
    return
  }

  const resolvedValue = resolvedTheme ? (value?.[resolvedTheme] ?? resolvedTheme) : undefined
  const attributes = Array.isArray(attribute) ? attribute : [attribute]

  for (const attributeName of attributes) {
    if (attributeName === 'class') {
      const classNames = new Set(['dark', 'light', ...themes, ...Object.values(value ?? {})])
      document.documentElement.classList.remove(...classNames)
      if (resolvedValue) {
        document.documentElement.classList.add(resolvedValue)
      }
      continue
    }

    if (resolvedValue) {
      document.documentElement.setAttribute(attributeName, resolvedValue)
    } else {
      document.documentElement.removeAttribute(attributeName)
    }
  }

  if (enableColorScheme) {
    document.documentElement.style.colorScheme =
      resolvedValue === 'dark' || resolvedValue === 'light' ? resolvedValue : ''
  }
}

export function ThemeProvider({
  attribute = 'data-theme',
  children,
  defaultTheme = 'system',
  enableColorScheme = true,
  enableSystem = true,
  forcedTheme,
  storageKey = 'theme',
  themes = ['light', 'dark'],
  value,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState(() => getStoredTheme(storageKey, defaultTheme))
  const [systemTheme, setSystemTheme] = useState(getSystemTheme)
  const resolvedTheme = forcedTheme ?? (theme === 'system' && enableSystem ? systemTheme : theme)
  const availableThemes = useMemo(
    () => (enableSystem && !themes.includes('system') ? [...themes, 'system'] : themes),
    [enableSystem, themes]
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => setSystemTheme(getSystemTheme())
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || forcedTheme) {
      return
    }

    try {
      window.localStorage.setItem(storageKey, theme)
    } catch {
      // Storybook のローカルストレージが利用できない環境でもテーマ表示は継続する。
    }
  }, [forcedTheme, storageKey, theme])

  useEffect(() => {
    applyTheme({ attribute, enableColorScheme, resolvedTheme, themes: availableThemes, value })
  }, [attribute, availableThemes, enableColorScheme, resolvedTheme, value])

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      forcedTheme,
      resolvedTheme,
      setTheme,
      systemTheme: enableSystem ? systemTheme : undefined,
      theme,
      themes: availableThemes,
    }),
    [availableThemes, enableSystem, forcedTheme, resolvedTheme, systemTheme, theme]
  )

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
