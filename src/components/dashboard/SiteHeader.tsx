import { UserButton } from '@clerk/nextjs'
import { Settings } from 'lucide-react'
import { SidebarTrigger } from '@/components/Sidebar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Separator } from '@/components/ui/separator'

export function SiteHeader({ title = 'Dashboard' }: { title?: string }) {
  return (
    <header className="flex h-[--header-height] shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[--header-height]">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator className="mx-2 data-[orientation=vertical]:h-4" orientation="vertical" />
        <h1 className="font-medium text-base">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <UserButton>
            <UserButton.Link href="/settings" label="設定" labelIcon={<Settings className="size-4" />} />
          </UserButton>
        </div>
      </div>
    </header>
  )
}
