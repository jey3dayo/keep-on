import { render, screen } from '@testing-library/react'
import type { JSX, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { NAV_ITEMS } from '@/constants/navigation'
import { MobileTabBarSlotProvider, useMobileTabBarSlot } from '@/contexts/MobileTabBarSlotContext'
import { MobileTabBar } from './MobileTabBar'

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(() => '/settings/profile'),
}))

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
}))

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode
    href: string
    [key: string]: unknown
  }): JSX.Element => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('MobileTabBar', () => {
  it('/settingsでも4枠を表示する', () => {
    usePathnameMock.mockReturnValue('/settings')
    render(<MobileTabBar />)

    const items = [...NAV_ITEMS.main, ...NAV_ITEMS.secondary].filter((item) => item.url !== '/help')
    const nav = screen.getByRole('navigation', { name: 'メインナビゲーション' })
    expect(nav.children).toHaveLength(4)
    expect(screen.getAllByRole('link')).toHaveLength(4)

    for (const item of items) {
      expect(screen.getByRole('link', { name: item.titleKey })).toHaveAttribute('href', item.url)
    }

    expect(screen.getByRole('link', { name: 'navigation.settings' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'navigation.dashboard' })).not.toHaveAttribute('aria-current')
    expect(screen.queryByRole('link', { name: 'navigation.help' })).not.toBeInTheDocument()
    expect(nav.lastElementChild).toBe(screen.getByRole('link', { name: 'navigation.settings' }))
  })

  it('スロットが無いとき余分なセルを描画しない', () => {
    usePathnameMock.mockReturnValue('/habits')
    render(<MobileTabBar />)

    const nav = screen.getByRole('navigation', { name: 'メインナビゲーション' })
    expect(nav.children).toHaveLength(4)
    expect(nav.querySelector('div')).not.toBeInTheDocument()
  })

  it('登録されたslotをダッシュボードタブの隣に表示し、設定を右端に保つ', () => {
    usePathnameMock.mockReturnValue('/dashboard')

    function SlotRegistrar() {
      useMobileTabBarSlot(
        <button aria-label="リスト表示に切り替え" type="button">
          リスト
        </button>
      )
      return null
    }

    render(
      <MobileTabBarSlotProvider>
        <SlotRegistrar />
        <MobileTabBar />
      </MobileTabBarSlotProvider>
    )

    expect(screen.getAllByRole('link')).toHaveLength(4)

    // ビュー切替はダッシュボード表示に作用するコントロールなので、ダッシュボードタブの直後に置き、
    // 設定は慣例どおり右端に保つ
    const nav = screen.getByRole('navigation', { name: 'メインナビゲーション' })
    const dashboard = screen.getByRole('link', { name: 'navigation.dashboard' })
    const toggle = screen.getByRole('button', { name: 'リスト表示に切り替え' })
    const settings = screen.getByRole('link', { name: 'navigation.settings' })

    expect(nav.children).toHaveLength(5)
    const slots = Array.from(nav.children)
    expect(slots.indexOf(dashboard)).toBe(0)
    expect(slots[1]?.contains(toggle)).toBe(true)
    expect(nav.lastElementChild).toBe(settings)
  })
})
