'use client'

import type * as React from 'react'
import { ClerkUserButton } from '@/components/clerk/ClerkUserButton'
import { MobileNavDrawer } from '@/components/dashboard/MobileNavDrawer'
import { NavMain } from '@/components/dashboard/NavMain'
import { NavSecondary } from '@/components/dashboard/NavSecondary'
import { Sidebar, SidebarContent, SidebarFooter, useSidebar } from '@/components/sidebar/Sidebar'
import { NAV_ITEMS } from '@/constants/navigation'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isMobile } = useSidebar()

  // スマホ幅では左サイドバーではなく下部シートでナビゲーションを出す（SidebarTrigger の状態を共有する）
  if (isMobile) {
    return <MobileNavDrawer />
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
          <ClerkUserButton
            appearance={{
              elements: {
                avatarBox: 'size-8',
              },
            }}
          />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
