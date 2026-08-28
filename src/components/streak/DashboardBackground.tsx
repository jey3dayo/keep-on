import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DashboardBackgroundProps {
  backgroundColor?: string
  children: ReactNode
  className?: string
  style?: CSSProperties
}

/**
 * ダッシュボード両ビュー（アイコン / リスト）共通の背景。
 *
 * コンテナの外側（body / iOS standalone の safe-area・オーバースクロール域）は
 * StreakDashboard の useEffect が素の --primary で塗っている。そのため、この
 * グラデーションは下端で必ず transparent に落として素の背景色と一致させること。
 * 下端に不透明な暗色を残すと、コンテナが尽きた先の body の塗りと段差が出て
 * 「下側だけ明るい帯」が再発する。
 */
export function DashboardBackground({ backgroundColor, children, className, style }: DashboardBackgroundProps) {
  return (
    <div
      className={cn('streak-bg relative isolate flex min-h-full flex-col', className)}
      style={{ backgroundColor: backgroundColor ?? 'var(--primary)', ...style }}
    >
      {/*
        isolate で負の z-index をこの背景内に閉じ、親の SidebarInset 背景に隠れない SSR 下敷きにする。
        fixed 下敷きは後続兄弟として header の上に描画されるため、header 領域は覆わない。
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-[calc(var(--header-height)+env(safe-area-inset-top))] bottom-0 -z-10"
        style={{ backgroundColor: backgroundColor ?? 'var(--primary)' }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),transparent_70%)]" />
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
