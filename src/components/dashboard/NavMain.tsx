'use client'

import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/sidebar/Sidebar'

export function NavMain({
  items,
}: {
  items: {
    titleKey: string
    url: string
    icon?: LucideIcon
  }[]
}) {
  const { t } = useTranslation()

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.titleKey}>
              <SidebarMenuButton asChild tooltip={t(item.titleKey)}>
                <Link href={item.url} prefetch={false}>
                  {item.icon ? <item.icon /> : null}
                  <span>{t(item.titleKey)}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
