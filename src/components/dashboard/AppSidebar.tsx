'use client'

import { UserButton } from '@clerk/nextjs'
import { BarChart3, LayoutDashboard, ListChecks, Power, Settings } from 'lucide-react'
import type * as React from 'react'

import { NavMain } from '@/components/dashboard/NavMain'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/Sidebar'

const data = {
  navMain: [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Habits',
      url: '/habits',
      icon: ListChecks,
    },
    {
      title: 'Analytics',
      url: '/analytics',
      icon: BarChart3,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="/dashboard">
                <Power className="!size-5" />
                <span className="font-semibold text-base">KeepOn</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 p-2">
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'size-8',
              },
            }}
          >
            <UserButton.MenuItems>
              <UserButton.Link href="/settings" label="設定" labelIcon={<Settings className="size-4" />} />
            </UserButton.MenuItems>
          </UserButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
