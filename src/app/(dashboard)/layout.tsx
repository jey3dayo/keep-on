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
          '--tabbar-height': 'calc(var(--spacing) * 14)',
        } as React.CSSProperties
      }
    >
      <OfflineIndicator />
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        {/*
          モバイルの設定ピルは設定タブと重複し、ページドットとビュー切替は各コンテンツへ移したため、
          旧のフッター slot 機構を廃止した。MobileTabBar はコンテンツ上の absolute overlay なので、
          スクロールコンテナ側でタブバー本体と safe-area 分の padding を予約する。md 幅で safe-area を
          持つ環境（iPad standalone）では、従来どおりスクロールコンテナ自身が safe-area を確保する。
        */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden max-md:pb-[calc(var(--tabbar-height)+env(safe-area-inset-bottom))] md:pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
        <MobileTabBar />
      </SidebarInset>
      {modal}
    </SidebarProvider>
  )
}
