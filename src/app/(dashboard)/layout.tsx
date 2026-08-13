import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/dashboard/AppSidebar'
import { SiteHeader } from '@/components/dashboard/SiteHeader'
import { OfflineIndicator } from '@/components/pwa/OfflineIndicator'
import { SidebarInset, SidebarProvider } from '@/components/sidebar/Sidebar'
import { getAccessIdentity } from '@/lib/auth/access'

const SIDEBAR_COOKIE_NAME = 'sidebar_state'

export default async function DashboardLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  // Access が前段でアクセスを強制するため実質到達しない。検証が通らない場合の保険
  const identity = await getAccessIdentity()
  if (!identity) {
    redirect('/')
  }

  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value ?? null
  const defaultOpen = sidebarCookie ? sidebarCookie === 'true' : true

  return (
    <SidebarProvider
      // シェルの高さを viewport に固定する。min-h だけだとコンテンツが document を伸ばし、
      // 内側の overflow-y-auto が clamp されず fixed 要素とスクロール位置がずれる
      className="h-dvh overflow-hidden"
      defaultOpen={defaultOpen}
      style={
        {
          '--header-height': 'calc(var(--spacing) * 12)',
          '--sidebar-width': 'calc(var(--spacing) * 72)',
        } as React.CSSProperties
      }
    >
      <OfflineIndicator />
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        {/* このスクロールコンテナは (dashboard) 配下の全ページに効く。固定 nav を持つページでは nav 側にも
            safe-area があり重複するが、fixed nav はビューポート基準で重なりは発生しないため許容している */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </SidebarInset>
      {modal}
    </SidebarProvider>
  )
}
