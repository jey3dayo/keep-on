import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AddHabitButton, Button, CheckInButton } from './Button'

describe('Button', () => {
  it('子要素をレンダリングする', () => {
    render(<Button>クリック</Button>)
    expect(screen.getByRole('button', { name: 'クリック' })).toBeInTheDocument()
  })

  it('デフォルトでprimaryバリアントが適用される', () => {
    render(<Button>クリック</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-primary')
  })

  it('secondaryバリアントが適用される', () => {
    render(<Button variant="secondary">クリック</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-secondary')
  })

  it('destructiveバリアントが適用される', () => {
    render(<Button variant="destructive">クリック</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-destructive')
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

  it('チェックインボタンはhover拡大を使わず、reduced-motion対応のpress反応を持つ', () => {
    render(<CheckInButton>チェックイン</CheckInButton>)
    const button = screen.getByRole('button', { name: 'チェックイン' })

    expect(button.className).not.toContain('hover:scale-110')
    expect(button.className).toContain('duration-160')
    expect(button.className).toContain('motion-reduce:active:scale-100')
  })

  it('習慣追加CTAのhover強調は維持される', () => {
    render(<AddHabitButton>習慣を追加</AddHabitButton>)
    const button = screen.getByRole('button', { name: '習慣を追加' })

    expect(button.className).toContain('hover:scale-105')
    expect(button.className).toContain('motion-reduce:hover:scale-100')
  })
})
