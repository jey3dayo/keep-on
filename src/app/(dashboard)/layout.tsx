import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/dashboard/AppSidebar'
import { SiteHeader } from '@/components/dashboard/SiteHeader'
import { SidebarInset, SidebarProvider } from '@/components/Sidebar'
import { SIGN_IN_PATH } from '@/constants/auth'

export default async function DashboardLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  const { userId } = await auth()
  if (!userId) {
    redirect(SIGN_IN_PATH)
  }

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
      {modal}
    </SidebarProvider>
  )
}
