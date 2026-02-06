import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import type React from 'react'
import { ColorThemeScript } from '@/components/basics/ColorThemeScript'
import { ThemeModeScript } from '@/components/basics/ThemeModeScript'
import { ThemeProvider } from '@/components/basics/ThemeProvider'
import { SyncProviderWrapper } from '@/components/providers/SyncProviderWrapper'
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

// Development-only: agentation toolbar
let DevAgentationToolbar: React.ComponentType = () => null

if (process.env.NODE_ENV !== 'production') {
  const dynamic = require('next/dynamic').default
  DevAgentationToolbar = dynamic(() =>
    import('@/components/dev/AgentationToolbar').then((mod) => mod.AgentationToolbar)
  )
}

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

const nameHelperScript = `
(function() {
  try {
    var globalRef = typeof globalThis !== 'undefined' ? globalThis : window;
    if (typeof globalRef.__name !== 'function') {
      globalRef.__name = function(target, name) {
        try {
          Object.defineProperty(target, 'name', { value: name, configurable: true });
        } catch (e) {}
        return target;
      };
    }
  } catch (e) {}
})();
`

const swRegistrationScript = `
(function() {
  try {
    if (!('serviceWorker' in navigator)) return;
    if (window.__swRegistering) return;
    window.__swRegistering = true;
    navigator.serviceWorker.register('/sw.js').catch(function() {});
  } catch (e) {}
})();
`

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
          <script dangerouslySetInnerHTML={{ __html: nameHelperScript }} />
          {process.env.NODE_ENV === 'production' ? (
            <script dangerouslySetInnerHTML={{ __html: swRegistrationScript }} />
          ) : null}
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
          <SyncProviderWrapper>
            <ThemeProvider defaultTheme={themeMode}>
              <div id="main-content" tabIndex={-1}>
                {children}
              </div>
              <Toaster position="bottom-right" richColors />
            </ThemeProvider>
          </SyncProviderWrapper>
          <ServiceWorkerRegistration />
          <A2HSPrompt />
          <DevAgentationToolbar />
        </body>
      </html>
    </ClerkProvider>
  )
}
