'use client'

import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/basics/ThemeToggle'
import { ClerkUserButton } from '@/components/clerk/ClerkUserButton'
import { SidebarTrigger } from '@/components/sidebar/Sidebar'
import { Separator } from '@/components/ui/separator'
import { getPageTitle } from '@/constants/navigation'

export function SiteHeader() {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="flex h-[--header-height] shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[--header-height]">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator className="mx-2 data-[orientation=vertical]:h-4" orientation="vertical" />
        <h1 className="font-medium text-base">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <ClerkUserButton />
        </div>
      </div>
    </header>
  )
}
