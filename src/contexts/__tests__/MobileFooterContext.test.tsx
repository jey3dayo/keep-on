import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MobileFooterProvider, useFooterSlot, useMobileFooterSlots } from '../MobileFooterContext'

// 回帰テスト: context を dispatch / state に分割していないと、登録側が context value 全体を
// 購読するためスロット更新のたびに再レンダーされ、インライン JSX の参照が変わって effect が
// 再実行され、無限ループになる。過去に実装がこの形で入り、モバイル経路のテストが無かったため
// 全テスト green のまま素通りした。統合し直すとこのテストがタイムアウトする。
describe('useFooterSlot', () => {
  it('毎レンダー新しい JSX を登録しても再レンダーが収束する', () => {
    let renderCount = 0

    function Registrar() {
      renderCount++
      // 呼び出し側（StreakDashboard / HabitSimpleView）と同じくインラインで JSX を渡す
      useFooterSlot('right', <button type="button">ビュー切替</button>)
      return null
    }

    function Outlet() {
      const { rightSlot } = useMobileFooterSlots()
      return <div>{rightSlot}</div>
    }

    render(
      <MobileFooterProvider>
        <Registrar />
        <Outlet />
      </MobileFooterProvider>
    )

    expect(screen.getByRole('button', { name: 'ビュー切替' })).toBeInTheDocument()
    // 収束していれば初回 + effect 由来の数回で収まる。ループしていればここへ到達せずタイムアウトする
    expect(renderCount).toBeLessThan(5)
  })

  it('登録者がアンマウントされるとスロットが空になる', () => {
    function Registrar() {
      useFooterSlot('left', <span>設定</span>)
      return null
    }

    function Outlet() {
      const { leftSlot } = useMobileFooterSlots()
      return <div data-testid="outlet">{leftSlot}</div>
    }

    const { rerender } = render(
      <MobileFooterProvider>
        <Registrar />
        <Outlet />
      </MobileFooterProvider>
    )
    expect(screen.getByText('設定')).toBeInTheDocument()

    rerender(
      <MobileFooterProvider>
        <Outlet />
      </MobileFooterProvider>
    )
    expect(screen.getByTestId('outlet')).toBeEmptyDOMElement()
  })
})
