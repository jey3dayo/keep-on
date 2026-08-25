'use client'

import { LogOut } from 'lucide-react'
import type * as React from 'react'
import { NavMain } from '@/components/dashboard/NavMain'
import { NavSecondary } from '@/components/dashboard/NavSecondary'
import { Sidebar, SidebarContent, SidebarFooter, useSidebar } from '@/components/sidebar/Sidebar'
import { ACCESS_LOGOUT_URL } from '@/constants/auth'
import { NAV_ITEMS } from '@/constants/navigation'

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
          <a
            aria-label="サインアウト"
            className="flex size-8 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground"
            href={ACCESS_LOGOUT_URL}
          >
            <LogOut className="size-4" />
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
