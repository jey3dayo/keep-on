import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AccountSettings } from './AccountSettings'

const { signOutMock } = vi.hoisted(() => ({ signOutMock: vi.fn() }))

vi.mock('@/lib/auth/sign-out', () => ({
  signOut: signOutMock,
}))

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

describe('AccountSettings', () => {
  it('ログアウトボタンとヘルプへのリンクを表示する', () => {
    render(<AccountSettings />)

    fireEvent.click(screen.getByRole('button', { name: 'サインアウト' }))

    expect(signOutMock).toHaveBeenCalledOnce()
    expect(screen.getByRole('link', { name: 'ヘルプ' })).toHaveAttribute('href', '/help')
  })
})
