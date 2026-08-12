'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface DashboardBottomBarProps {
  className?: string
  leftSlot?: ReactNode
  rightSlot?: ReactNode
}

// bottom オフセット（safe-area 込み）はこのコンポーネントにのみ定義する。ビュー側で fixed の下部 chrome を追加しない。
export function DashboardBottomBar({ className, leftSlot, rightSlot }: DashboardBottomBarProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  // 祖先が containing block になると iOS で位置がビューごとにズレるため、body 直下へ出して viewport 基準を保証する
  return createPortal(
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex items-center px-4',
        className
      )}
    >
      {/*
       * スロットは中身の幅だけを占めること。flex-1 で余白まで広げると、
       * 透明なのに pointer-events-auto な帯が重なり、別インスタンスのバーの
       * ボタン（ビュー切替トグル等）がクリックできなくなる。
       */}
      {leftSlot ? <div className="pointer-events-auto flex items-center">{leftSlot}</div> : null}
      {rightSlot ? <div className="pointer-events-auto ml-auto flex items-center gap-3">{rightSlot}</div> : null}
    </div>,
    document.body
  )
}
