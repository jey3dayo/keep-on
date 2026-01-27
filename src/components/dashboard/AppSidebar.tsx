'use client'

import Image from 'next/image'
import type * as React from 'react'
import { ClerkUserButton } from '@/components/ClerkUserButton'
import { NavMain } from '@/components/dashboard/NavMain'
import { NavSecondary } from '@/components/dashboard/NavSecondary'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/Sidebar'
import { NAV_ITEMS } from '@/constants/navigation'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="/dashboard">
                <Image alt="" className="h-5 w-auto" height={20} src="/logo.svg" width={30} />
                <span className="font-semibold text-base">KeepOn</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
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
