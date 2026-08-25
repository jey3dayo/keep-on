'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { NAV_ITEMS, type NavItem } from '@/constants/navigation'
import { cn } from '@/lib/utils'

function isActivePath(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(`${url}/`)
}

function TabItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const { t } = useTranslation()
  const active = isActivePath(pathname, item.url)

  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 transition-colors active:bg-accent/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'text-foreground' : 'text-foreground/60'
      )}
      href={item.url}
      prefetch={false}
    >
      <item.icon className="size-5 shrink-0" />
      <span className="truncate text-[10px] leading-none">{t(item.titleKey)}</span>
    </Link>
  )
}

/**
 * スマホ幅のナビゲーション。以前はハンバーガー→下部シート(Drawer)だったが、
 * 遷移先を一目で把握できるタブ型に置き換えた。NAV_ITEMS 全項目（main + secondary）を
 * 常時 5 タブとして表示するため、Drawer にあった見出しなし/開閉の概念自体が不要になった。
 */
export function MobileTabBar() {
  const pathname = usePathname()
  const items = [...NAV_ITEMS.main, ...NAV_ITEMS.secondary]

  return (
    <nav
      aria-label="メインナビゲーション"
      className="flex shrink-0 border-border/50 border-t bg-background/50 pb-[env(safe-area-inset-bottom)] backdrop-blur-md supports-[backdrop-filter]:bg-background/30 md:hidden"
    >
      {items.map((item) => (
        <TabItem item={item} key={item.titleKey} pathname={pathname} />
      ))}
    </nav>
  )
}
