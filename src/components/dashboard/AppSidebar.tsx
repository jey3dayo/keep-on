'use client'

import { UserButton } from '@clerk/nextjs'
import { BarChart3, HelpCircle, LayoutDashboard, ListChecks, Settings } from 'lucide-react'
import Image from 'next/image'
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
} from '@/components/Sidebar'

const data = {
  navMain: [
    {
      title: 'ダッシュボード',
      url: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: '習慣',
      url: '/habits',
      icon: ListChecks,
    },
    {
      title: 'アナリティクス',
      url: '/analytics',
      icon: BarChart3,
    },
  ],
  navSecondary: [
    {
      title: '設定',
      url: '/settings',
      icon: Settings,
    },
    {
      title: 'ヘルプ',
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
                <Image alt="" className="h-5 w-auto" height={20} src="/logo.svg" width={30} />
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
