import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('子要素をレンダリングする', () => {
    render(<Button>クリック</Button>)
    expect(screen.getByRole('button', { name: 'クリック' })).toBeInTheDocument()
  })

  it('デフォルトでprimaryバリアントが適用される', () => {
    render(<Button>クリック</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-blue-600')
  })

  it('secondaryバリアントが適用される', () => {
    render(<Button variant="secondary">クリック</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-gray-200')
  })

  it('dangerバリアントが適用される', () => {
    render(<Button variant="danger">クリック</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-red-600')
  })

  it('カスタムクラス名が適用される', () => {
    render(<Button className="custom-class">クリック</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('custom-class')
  })

  it('クリックイベントが発火する', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>クリック</Button>)

    const button = screen.getByRole('button')
    await user.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('disabled属性が適用される', () => {
    render(<Button disabled>クリック</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('デフォルトでtype="button"が設定される', () => {
    render(<Button>クリック</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('type', 'button')
  })

  it('type属性を上書きできる', () => {
    render(<Button type="submit">送信</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('type', 'submit')
  })
})
