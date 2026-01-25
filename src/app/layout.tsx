import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata, Viewport } from 'next'
import { A2HSPrompt } from '@/components/pwa/A2HSPrompt'
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration'
import { ThemeProvider } from '@/components/ThemeProvider'
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
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="ja" suppressHydrationWarning>
        <body>
          <ThemeProvider>{children}</ThemeProvider>
          <ServiceWorkerRegistration />
          <A2HSPrompt />
        </body>
      </html>
    </ClerkProvider>
  )
}
