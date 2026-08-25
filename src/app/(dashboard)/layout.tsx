import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/dashboard/AppSidebar'
import { MobileFooterOutlet } from '@/components/dashboard/MobileFooterOutlet'
import { SiteHeader } from '@/components/dashboard/SiteHeader'
import { OfflineIndicator } from '@/components/pwa/OfflineIndicator'
import { SidebarInset, SidebarProvider } from '@/components/sidebar/Sidebar'
import { SIGN_IN_PATH } from '@/constants/auth'
import { MobileFooterProvider } from '@/contexts/MobileFooterContext'
import { getAccessIdentity } from '@/lib/auth/access'

const SIDEBAR_COOKIE_NAME = 'sidebar_state'

export default async function DashboardLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  // Access が前段でアクセスを強制するため実質到達しない。JWT 検証失敗時は SIGN_IN_PATH（ループしない静的案内）へ
  const identity = await getAccessIdentity()
  if (!identity) {
    redirect(SIGN_IN_PATH)
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
        <MobileFooterProvider>
          {/* このスクロールコンテナは (dashboard) 配下の全ページに効く。footer(MobileFooterOutlet) が
              実体を持つページでは footer 自身が safe-area を確保するため、ここでの pb-safe-area は
              `:has(+ [data-mobile-footer])` で 0 に落として二重確保を避ける。footer が空（/analytics,
              /settings 等）で何も描画されないページでは、このコンテナが引き続き画面最下端に接するので
              自前の safe-area 確保を残す必要がある */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pb-[env(safe-area-inset-bottom)] [&:has(+[data-mobile-footer])]:pb-0">
            {children}
          </div>
          <MobileFooterOutlet />
        </MobileFooterProvider>
      </SidebarInset>
      {modal}
    </SidebarProvider>
  )
}
