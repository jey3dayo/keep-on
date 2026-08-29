import { render, screen } from '@testing-library/react'
import type { JSX, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { NAV_ITEMS } from '@/constants/navigation'
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
  it('/settingsでも4枠を表示し、設定を右端に置く', () => {
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
})
