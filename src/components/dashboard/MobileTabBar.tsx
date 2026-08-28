'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { NAV_ITEMS, type NavItem } from '@/constants/navigation'
import { useMobileTabBarSlotValue } from '@/contexts/MobileTabBarSlotContext'
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
      <item.icon aria-hidden="true" className="size-5 shrink-0" />
      <span className="truncate text-[10px] leading-none">{t(item.titleKey)}</span>
    </Link>
  )
}

/**
 * スマホ幅のナビゲーション。以前はハンバーガー→下部シート(Drawer)だったが、
 * 遷移先を一目で把握できるタブ型に置き換えた。主要4タブにダッシュボードだけが使う
 * ビュー切替 slot を加えられる構成にし、Drawer にあった見出しなし/開閉の概念をなくしている。
 * slot はダッシュボードタブの隣（2番目）に挿入する。作用対象との近接を保ち、設定を右端に固定するため。
 *
 * フロー内だとバーの背後が body になり、バウンスや Safari の UI 縮小でコンテンツとの間に背景色が露出して
 * 「ちぎれ」て見えた（実測）。HIG はタブバーをコンテンツ上の overlay と定義し、translucent はコンテンツの
 * 潜り込みが前提のため、overlay + スクローラ側 padding-bottom でコンテンツを下へ潜り込ませる。
 * タブの高さは min-h-14（3.5rem）と layout.tsx の --tabbar-height を一致させる。min-h-14 を変える場合は
 * layout.tsx の変数も揃えること。
 */
export function MobileTabBar() {
  const pathname = usePathname()
  const trailingSlot = useMobileTabBarSlotValue()
  // ヘルプはデスクトップの二次ナビに残し、モバイルは主要4タブの横幅と見つけやすさを優先する。
  const items = [...NAV_ITEMS.main, ...NAV_ITEMS.secondary].filter((item) => item.url !== '/help')

  return (
    <nav
      aria-label="メインナビゲーション"
      className="absolute inset-x-0 bottom-0 z-30 flex border-border/50 border-t bg-background/50 pb-[env(safe-area-inset-bottom)] backdrop-blur-md supports-[backdrop-filter]:bg-background/30 md:hidden"
    >
      {items.map((item) => (
        <Fragment key={item.titleKey}>
          <TabItem item={item} pathname={pathname} />
          {/* slot はダッシュボードのビュー切替。作用対象のタブの隣に置き、設定を右端に保つ。 */}
          {item.url === '/dashboard' && trailingSlot ? (
            <div className="flex min-h-14 flex-1 items-center justify-center">{trailingSlot}</div>
          ) : null}
        </Fragment>
      ))}
    </nav>
  )
}
