'use client'

import type * as React from 'react'
import { ClerkUserButton } from '@/components/clerk/ClerkUserButton'
import { NavMain } from '@/components/dashboard/NavMain'
import { NavSecondary } from '@/components/dashboard/NavSecondary'
import { Sidebar, SidebarContent, SidebarFooter } from '@/components/sidebar/Sidebar'
import { NAV_ITEMS } from '@/constants/navigation'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarContent>
        <NavMain items={NAV_ITEMS.main} />
        <NavSecondary className="mt-auto" items={NAV_ITEMS.secondary} />
      </SidebarContent>
      <SidebarFooter>
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
