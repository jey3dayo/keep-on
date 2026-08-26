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
  it('ヘルプを除いた4タブを表示し、現在地だけ aria-current を付ける', () => {
    render(<MobileTabBar />)

    const items = [...NAV_ITEMS.main, ...NAV_ITEMS.secondary].filter((item) => item.url !== '/help')
    expect(screen.getAllByRole('link')).toHaveLength(4)

    for (const item of items) {
      expect(screen.getByRole('link', { name: item.titleKey })).toHaveAttribute('href', item.url)
    }

    expect(screen.getByRole('link', { name: 'navigation.settings' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'navigation.dashboard' })).not.toHaveAttribute('aria-current')
    expect(screen.queryByRole('link', { name: 'navigation.help' })).not.toBeInTheDocument()
  })

  it('登録されたtrailing slotを5番目の枠に表示する', () => {
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
    expect(screen.getByRole('button', { name: 'リスト表示に切り替え' })).toBeInTheDocument()
  })
})
