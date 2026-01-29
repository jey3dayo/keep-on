import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import type React from 'react'
import { ColorThemeScript } from '@/components/basics/ColorThemeScript'
import { ThemeModeScript } from '@/components/basics/ThemeModeScript'
import { ThemeProvider } from '@/components/basics/ThemeProvider'
import { A2HSPrompt } from '@/components/pwa/A2HSPrompt'
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration'
import { Toaster } from '@/components/ui/sonner'
import {
  COLOR_THEME_COOKIE_KEY,
  DEFAULT_THEME_MODE,
  isColorTheme,
  THEME_COLOR_DARK,
  THEME_COLOR_LIGHT,
  THEME_MODE_COOKIE_KEY,
} from '@/constants/theme'
import './globals.css'

export const metadata: Metadata = {
  title: 'KeepOn - 習慣トラッキング',
  description: 'シンプルな習慣トラッキングアプリ',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KeepOn',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const rawThemeMode = cookieStore.get(THEME_MODE_COOKIE_KEY)?.value ?? null
  const themeMode =
    rawThemeMode === 'light' || rawThemeMode === 'dark' || rawThemeMode === 'system' ? rawThemeMode : DEFAULT_THEME_MODE
  const rawColorTheme = cookieStore.get(COLOR_THEME_COOKIE_KEY)?.value ?? null
  const colorTheme = rawColorTheme && isColorTheme(rawColorTheme) ? rawColorTheme : undefined
  const htmlClassName = themeMode === 'light' || themeMode === 'dark' ? themeMode : undefined

  return (
    <ClerkProvider>
      <html className={htmlClassName} data-theme={colorTheme} lang="ja" suppressHydrationWarning>
        <head>
          <meta content="light dark" name="color-scheme" />
          <meta content={THEME_COLOR_LIGHT} name="theme-color" />
          <meta content={THEME_COLOR_DARK} media="(prefers-color-scheme: dark)" name="theme-color" />
          <ThemeModeScript />
          <ColorThemeScript />
        </head>
        <body>
          <a
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-foreground focus:shadow focus:ring-2 focus:ring-ring focus:ring-offset-2"
            href="#main-content"
          >
            本文へスキップ
          </a>
          <ThemeProvider defaultTheme={themeMode}>
            <div id="main-content" tabIndex={-1}>
              {children}
            </div>
            <Toaster position="bottom-right" richColors />
          </ThemeProvider>
          <ServiceWorkerRegistration />
          <A2HSPrompt />
        </body>
      </html>
    </ClerkProvider>
  )
}
