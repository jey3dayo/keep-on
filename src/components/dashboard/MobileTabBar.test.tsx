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
  it('main と secondary の 5 タブを表示し、現在地だけ aria-current を付ける', () => {
    render(<MobileTabBar />)

    const items = [...NAV_ITEMS.main, ...NAV_ITEMS.secondary]
    expect(screen.getAllByRole('link')).toHaveLength(5)

    for (const item of items) {
      expect(screen.getByRole('link', { name: item.titleKey })).toHaveAttribute('href', item.url)
    }

    expect(screen.getByRole('link', { name: 'navigation.settings' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'navigation.dashboard' })).not.toHaveAttribute('aria-current')
  })
})
