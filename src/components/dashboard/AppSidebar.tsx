'use client'

import { LogOut } from 'lucide-react'
import type * as React from 'react'
import { NavMain } from '@/components/dashboard/NavMain'
import { NavSecondary } from '@/components/dashboard/NavSecondary'
import { Sidebar, SidebarContent, SidebarFooter, useSidebar } from '@/components/sidebar/Sidebar'
import { NAV_ITEMS } from '@/constants/navigation'
import { signOut } from '@/lib/auth/sign-out'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isMobile } = useSidebar()

  // モバイルのナビゲーションは MobileTabBar（layout.tsx）が担うため、サイドバーは描画しない。
  if (isMobile) {
    return null
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      {/* モバイルは Sheet 全画面表示のため、safe-area を自前で確保する（ui/sidebar.tsx は編集不可） */}
      <SidebarContent className="pt-[env(safe-area-inset-top)]">
        <NavMain items={NAV_ITEMS.main} />
        <NavSecondary className="mt-auto" items={NAV_ITEMS.secondary} />
      </SidebarContent>
      <SidebarFooter className="pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center gap-2 p-2">
          <button
            aria-label="サインアウト"
            className="icon-button flex min-h-11 min-w-11 items-center justify-center text-foreground/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={signOut}
            type="button"
          >
            <LogOut aria-hidden="true" className="size-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
