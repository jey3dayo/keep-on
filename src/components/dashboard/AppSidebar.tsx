'use client'

import { UserButton } from '@clerk/nextjs'
import { BarChart3, HelpCircle, LayoutDashboard, ListChecks, Power, Settings } from 'lucide-react'
import type * as React from 'react'

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
} from '@/components/ui/sidebar'

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
  navSecondary: [
    {
      title: 'Settings',
      url: '/settings',
      icon: Settings,
    },
    {
      title: 'Help',
      url: '/help',
      icon: HelpCircle,
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
        <NavSecondary className="mt-auto" items={data.navSecondary} />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 p-2">
          <UserButton
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
