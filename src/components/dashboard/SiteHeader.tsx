'use client'

import { LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ThemeToggle } from '@/components/basics/ThemeToggle'
import { LogoMark } from '@/components/LogoMark'
import { SyncIndicator } from '@/components/SyncIndicator'
import { SidebarTrigger } from '@/components/sidebar/Sidebar'
import { Separator } from '@/components/ui/separator'
import { ACCESS_LOGOUT_URL } from '@/constants/auth'
import { getPageTitleKey } from '@/constants/navigation'
import { SW_MSG_CLEAR_USER_CACHE } from '@/constants/pwa'

function clearLocalIdentityCache(): void {
  try {
    localStorage.removeItem('ko_identity')
  } catch {
    // localStorage 不可でもログアウト遷移は続行する
  }
}

function requestUserCacheClear(): void {
  navigator.serviceWorker?.controller?.postMessage({ type: SW_MSG_CLEAR_USER_CACHE })
}

export function SiteHeader() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const title = t(getPageTitleKey(pathname))

  const handleSignOut = useCallback(() => {
    // Access ログアウトへ遷移する前にユーザー固有 HTML / オフラインキューを捨てる
    clearLocalIdentityCache()
    requestUserCacheClear()
    window.location.assign(ACCESS_LOGOUT_URL)
  }, [])

  return (
    <header className="flex h-[calc(var(--header-height)+env(safe-area-inset-top))] shrink-0 items-center gap-2 border-border/50 border-b bg-background/50 pt-[env(safe-area-inset-top)] backdrop-blur-md supports-[backdrop-filter]:bg-background/30 md:rounded-t-xl md:border-r">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 min-h-11 min-w-11 text-foreground/80 hover:text-foreground" />
        <Link
          className="flex shrink-0 items-center gap-2 rounded-md px-1.5 py-1 text-foreground/90 transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          href="/dashboard"
          prefetch={false}
        >
          <LogoMark className="h-4 w-auto" />
          <span className="hidden font-semibold text-base tracking-tight sm:inline">KeepOn</span>
        </Link>
        <Separator
          className="mx-1.5 shrink-0 bg-foreground/20 data-[orientation=vertical]:h-4"
          orientation="vertical"
        />
        {/* ヘッダー高さは --header-height 固定。折り返すと溢れるため 1 行に固定して切り詰める */}
        <h1 className="min-w-0 truncate font-semibold text-[15px] text-foreground/90 tracking-[-0.01em]">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <SyncIndicator />
          <ThemeToggle buttonClassName="min-h-11 min-w-11" buttonVariant="ghost" />
          <button
            aria-label="サインアウト"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-foreground/80 transition-colors hover:text-foreground"
            onClick={handleSignOut}
            type="button"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
