import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/dashboard/AppSidebar'
import { MobileTabBar } from '@/components/dashboard/MobileTabBar'
import { SiteHeader } from '@/components/dashboard/SiteHeader'
import { OfflineIndicator } from '@/components/pwa/OfflineIndicator'
import { SidebarInset, SidebarProvider } from '@/components/sidebar/Sidebar'
import { SIGN_IN_PATH } from '@/constants/auth'
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
        {/*
          モバイルの設定ピルは設定タブと重複し、ページドットとビュー切替は各コンテンツへ移したため、
          旧のフッター slot 機構を廃止した。md:hidden の MobileTabBar は DOM に残るため :has で
          兄弟の有無を判定せず、md 幅で safe-area を持つ環境（iPad standalone）でも壊れないよう
          スクロールコンテナの padding を幅ごとに明示する。
        */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden max-md:pb-0 md:pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
        <MobileTabBar />
      </SidebarInset>
      {modal}
    </SidebarProvider>
  )
}
