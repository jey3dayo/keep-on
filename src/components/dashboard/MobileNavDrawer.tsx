'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { useSidebar } from '@/components/sidebar/Sidebar'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Separator } from '@/components/ui/separator'
import { NAV_ITEMS, type NavItem } from '@/constants/navigation'
import { cn } from '@/lib/utils'

function isActivePath(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(`${url}/`)
}

function NavRow({ item, onNavigate, pathname }: { item: NavItem; onNavigate: () => void; pathname: string }) {
  const { t } = useTranslation()
  const active = isActivePath(pathname, item.url)

  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-14 items-center gap-3 rounded-lg px-3 text-base transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-accent font-medium text-accent-foreground' : 'text-foreground/90 hover:bg-accent/50'
      )}
      href={item.url}
      onClick={onNavigate}
      prefetch={false}
    >
      <item.icon className="size-5 shrink-0" />
      <span className="truncate">{t(item.titleKey)}</span>
    </Link>
  )
}

/**
 * スマホ幅のナビゲーション。フルハイトの左サイドバーでは上部にしか項目が並ばず片手で届かないため、
 * 下部シートに置き換える。項目定義は NAV_ITEMS をサイドバーと共有する。
 */
export function MobileNavDrawer() {
  const { openMobile, setOpenMobile } = useSidebar()
  const pathname = usePathname()
  const { t } = useTranslation()

  const handleNavigate = useCallback(() => setOpenMobile(false), [setOpenMobile])

  return (
    <Drawer onOpenChange={setOpenMobile} open={openMobile}>
      {/* 下端固定の Drawer なので iOS のホームインジケータ分を確保する */}
      {/* 説明文は不要なので aria-describedby を明示的に外す（Radix の未設定警告を避ける） */}
      <DrawerContent aria-describedby={undefined} className="pb-[env(safe-area-inset-bottom)]">
        <DrawerHeader className="sr-only">
          <DrawerTitle>{t('navigation.menu')}</DrawerTitle>
        </DrawerHeader>
        <nav className="flex flex-col gap-1 p-3 pt-2">
          {NAV_ITEMS.main.map((item) => (
            <NavRow item={item} key={item.titleKey} onNavigate={handleNavigate} pathname={pathname} />
          ))}
          <Separator className="my-2" />
          {NAV_ITEMS.secondary.map((item) => (
            <NavRow item={item} key={item.titleKey} onNavigate={handleNavigate} pathname={pathname} />
          ))}
        </nav>
      </DrawerContent>
    </Drawer>
  )
}
