'use client'

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type FooterSlotSide = 'left' | 'right'

type RegisterSlot = (side: FooterSlotSide, node: ReactNode) => () => void

interface MobileFooterSlots {
  leftSlot: ReactNode
  rightSlot: ReactNode
}

// context を dispatch と state の 2 つに分けているのは、登録側を再レンダーさせないため。
// 1 つの context に両方を載せると、useContext は value 全体を購読するので
// スロット更新 → 登録側が再レンダー → インライン JSX が新しい参照になる → effect 再実行 →
// スロット更新、の無限ループになる（実測でテストがタイムアウトした）。統合し直さないこと。
const MobileFooterDispatchContext = createContext<RegisterSlot>(() => () => {
  // Provider の外（Storybook や個々のビューだけの単体テスト）では登録自体を行わないため解除も不要
})

const MobileFooterStateContext = createContext<MobileFooterSlots>({
  leftSlot: null,
  rightSlot: null,
})

export function MobileFooterProvider({ children }: { children: ReactNode }) {
  const [leftSlot, setLeftSlot] = useState<ReactNode>(null)
  const [rightSlot, setRightSlot] = useState<ReactNode>(null)

  // deps を空にして参照を永久に固定する。ここが変わると登録側が再レンダーし、上記のループが復活する。
  const registerSlot = useCallback<RegisterSlot>((side, node) => {
    // StreakDashboard と DesktopDashboard は同時にマウントされ、片方は showBottomBar=false で
    // node に null を渡す（詳細: HabitSimpleView の showBottomBar コメント）。null 登録を無視することで、
    // 後から実行される方の effect が先に登録された本物の内容をクリアしてしまう競合を防ぐ。
    if (node === null || node === undefined) {
      return () => {
        // 登録していないので解除も不要
      }
    }
    const setSlot = side === 'left' ? setLeftSlot : setRightSlot
    setSlot(node)
    // 自分が登録した内容がまだ残っているときだけ消す。別の登録者に差し替わっていれば触らない
    return () => setSlot((current) => (current === node ? null : current))
  }, [])

  const slots = useMemo(() => ({ leftSlot, rightSlot }), [leftSlot, rightSlot])

  return (
    <MobileFooterDispatchContext.Provider value={registerSlot}>
      <MobileFooterStateContext.Provider value={slots}>{children}</MobileFooterStateContext.Provider>
    </MobileFooterDispatchContext.Provider>
  )
}

// 呼び出し側の state を親へ持ち上げずに、footer の内容を 1 箇所の outlet へ登録するための hook。
// side ごとに 1 つの登録者だけが有効な内容を持つことを前提にしている（呼び出し側で保証する）。
// dispatch context だけを購読するため、スロット更新でこの hook の利用側は再レンダーされない。
export function useFooterSlot(side: FooterSlotSide, node: ReactNode) {
  const registerSlot = useContext(MobileFooterDispatchContext)
  // node は呼び出し側でインライン生成される JSX なので毎レンダー参照が変わる。
  // deps に残しているのは、ページドットのように中身が state に応じて変わる登録者を
  // 追従させるため。登録側は自分の state 変化でしか再レンダーしないので、これで収束する。
  useEffect(() => registerSlot(side, node), [side, registerSlot, node])
}

export function useMobileFooterSlots(): MobileFooterSlots {
  return useContext(MobileFooterStateContext)
}
