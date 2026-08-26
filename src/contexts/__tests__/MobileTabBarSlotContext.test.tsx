import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MobileTabBarSlotProvider, useMobileTabBarSlot, useMobileTabBarSlotValue } from '../MobileTabBarSlotContext'

// dispatch/stateを統合すると、インラインJSXの再登録が状態更新を呼び、無限ループになる。
// 登録側が再レンダーせず、表示側だけが更新される契約を固定する。
describe('MobileTabBarSlotContext', () => {
  it('毎レンダー新しいJSXを登録しても再レンダーが収束する', () => {
    let renderCount = 0

    function Registrar() {
      renderCount++
      useMobileTabBarSlot(<button type="button">ビュー切替</button>)
      return null
    }

    function Outlet() {
      const slot = useMobileTabBarSlotValue()
      return <div>{slot}</div>
    }

    render(
      <MobileTabBarSlotProvider>
        <Registrar />
        <Outlet />
      </MobileTabBarSlotProvider>
    )

    expect(screen.getByRole('button', { name: 'ビュー切替' })).toBeInTheDocument()
    expect(renderCount).toBeLessThan(5)
  })

  it('登録者がアンマウントされるとslotが空になる', () => {
    function Registrar() {
      useMobileTabBarSlot(<span>ビュー切替</span>)
      return null
    }

    function Outlet() {
      const slot = useMobileTabBarSlotValue()
      return <div data-testid="outlet">{slot}</div>
    }

    const { rerender } = render(
      <MobileTabBarSlotProvider>
        <Registrar />
        <Outlet />
      </MobileTabBarSlotProvider>
    )
    expect(screen.getByText('ビュー切替')).toBeInTheDocument()

    rerender(
      <MobileTabBarSlotProvider>
        <Outlet />
      </MobileTabBarSlotProvider>
    )
    expect(screen.getByTestId('outlet')).toBeEmptyDOMElement()
  })
})
