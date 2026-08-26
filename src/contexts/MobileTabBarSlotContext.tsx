'use client'

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react'

type RegisterSlot = (node: ReactNode) => () => void

// dispatch と state を分け、slot の更新で登録側を再レンダーさせない。
// 1つのcontextに両方を載せると、インラインJSXの参照が変わってeffectが再実行されるため、
// slot更新 → 登録側の再レンダー → 再登録の無限ループになる。
const MobileTabBarSlotDispatchContext = createContext<RegisterSlot>(() => () => {
  // Provider の外では登録を行わないため、解除も不要。
})
const MobileTabBarSlotStateContext = createContext<ReactNode>(null)

export function MobileTabBarSlotProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<ReactNode>(null)

  // 登録関数の参照を固定し、slot更新で登録側のeffectを再実行させない。
  const registerSlot = useCallback<RegisterSlot>((node) => {
    if (node === null || node === undefined) {
      return () => {
        // 登録していないため解除も不要。
      }
    }

    setSlot(node)
    // 別の登録者が先に更新していた場合、その内容を消さない。
    return () => setSlot((current) => (current === node ? null : current))
  }, [])

  return (
    <MobileTabBarSlotDispatchContext.Provider value={registerSlot}>
      <MobileTabBarSlotStateContext.Provider value={slot}>{children}</MobileTabBarSlotStateContext.Provider>
    </MobileTabBarSlotDispatchContext.Provider>
  )
}

export function useMobileTabBarSlot(node: ReactNode) {
  const registerSlot = useContext(MobileTabBarSlotDispatchContext)

  // node は呼び出し側で生成されたJSXをそのまま追従させる必要がある。
  useEffect(() => registerSlot(node), [node, registerSlot])
}

export function useMobileTabBarSlotValue(): ReactNode {
  return useContext(MobileTabBarSlotStateContext)
}
