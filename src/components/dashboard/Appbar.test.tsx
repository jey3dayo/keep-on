import { render, screen } from '@testing-library/react'
import type { JSX } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Appbar } from './Appbar'

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({
    alt,
    priority: _priority,
    ...props
  }: {
    alt?: string
    priority?: boolean
    [key: string]: unknown
  }): JSX.Element => (
    // biome-ignore lint/correctness/useImageSize lint/performance/noImgElement: テスト用のモック
    <img alt={alt} {...props} />
  ),
}))

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    prefetch: _prefetch,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }): JSX.Element => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// ClerkUserButton をモック
vi.mock('@/components/clerk/ClerkUserButton', () => ({
  ClerkUserButton: () => <div data-testid="clerk-user-button">UserButton</div>,
}))

describe('Appbar', () => {
  describe('レンダリング', () => {
    it('ロゴとアプリ名が表示される', () => {
      render(<Appbar />)

      expect(screen.getByText('KeepOn')).toBeInTheDocument()
    })

    it('ナビゲーションリンクが表示される', () => {
      render(<Appbar />)

      expect(screen.getByText('ホーム')).toBeInTheDocument()
      expect(screen.getByText('習慣')).toBeInTheDocument()
    })

    it('showUserButton=trueでUserButtonが表示される', () => {
      render(<Appbar showUserButton />)

      expect(screen.getByTestId('clerk-user-button')).toBeInTheDocument()
    })

    it('モバイルメニューボタンが表示される', () => {
      render(<Appbar />)

      const menuButton = screen.getByLabelText('メニューを開く')
      expect(menuButton).toBeInTheDocument()
    })
  })

  describe('ナビゲーション', () => {
    it('ナビゲーションリンクが正しいhrefを持つ', () => {
      render(<Appbar />)

      expect(screen.getByText('ホーム').closest('a')).toHaveAttribute('href', '/dashboard')
      expect(screen.getByText('習慣').closest('a')).toHaveAttribute('href', '/habits')
    })
  })
})
