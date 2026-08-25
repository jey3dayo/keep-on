'use client'

import { useMobileFooterSlots } from '@/contexts/MobileFooterContext'

// レイアウトに参加する footer。fixed で本文の上に浮かせていた旧 DashboardBottomBar と違い、
// ここは通常のフローに置いて高さを占有することで、スクロール領域が自動的に縮み本文と重ならない。
// 背景は透明のまま（simple view はフルブリードの色面デザインのため、不透明な帯を敷くとデザインが壊れる）。
// 両スロットが空のページ（/analytics, /settings 等）では高さ 0 にする必要があるため、
// 何も登録されていなければ何も描画しない。
export function MobileFooterOutlet() {
  const { leftSlot, rightSlot } = useMobileFooterSlots()

  if (!(leftSlot || rightSlot)) {
    return null
  }

  return (
    // data-mobile-footer は layout.tsx のスクロールコンテナが safe-area の二重確保を避けるための
    // フック。footer が実体を持つときだけ DOM に出る（このコンポーネントが null を返す間は無い）ので、
    // `:has(+ [data-mobile-footer])` でスクロール側が自分の safe-area pb を 0 に落とせる
    <div
      className="relative flex items-center px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden"
      data-mobile-footer=""
    >
      {leftSlot ? <div className="flex items-center">{leftSlot}</div> : null}
      {rightSlot ? <div className="ml-auto flex items-center gap-3">{rightSlot}</div> : null}
    </div>
  )
}
