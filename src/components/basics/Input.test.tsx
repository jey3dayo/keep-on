import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  describe('レンダリング', () => {
    it('基本的なinput要素がレンダリングされる', () => {
      render(<Input placeholder="入力してください" />)
      const input = screen.getByPlaceholderText('入力してください')
      expect(input).toBeInTheDocument()
    })

    it('type属性が適用される', () => {
      render(<Input placeholder="メールアドレス" type="email" />)
      const input = screen.getByPlaceholderText('メールアドレス')
      expect(input).toHaveAttribute('type', 'email')
    })

    it('デフォルトでパスワードマネージャーが無効', () => {
      render(<Input placeholder="パスワード" type="password" />)
      const input = screen.getByPlaceholderText('パスワード')

      expect(input).toHaveAttribute('data-1p-ignore', 'true')
      expect(input).toHaveAttribute('data-lpignore', 'true')
      expect(input).toHaveAttribute('data-form-type', 'other')
      expect(input).toHaveAttribute('autoComplete', 'off')
    })

    it('disablePasswordManagers=falseでパスワードマネージャーが有効', () => {
      render(<Input disablePasswordManagers={false} placeholder="パスワード" />)
      const input = screen.getByPlaceholderText('パスワード')

      expect(input).not.toHaveAttribute('data-1p-ignore')
      expect(input).not.toHaveAttribute('data-lpignore')
    })

    it('error状態でエラー用クラスが適用される', () => {
      render(<Input error placeholder="入力" />)
      const input = screen.getByPlaceholderText('入力')
      expect(input.className).toContain('border-destructive')
    })

    it('disabled属性が適用される', () => {
      render(<Input disabled placeholder="入力" />)
      const input = screen.getByPlaceholderText('入力')
      expect(input).toBeDisabled()
    })

    it('カスタムclassNameがマージされる', () => {
      render(<Input className="custom-class" placeholder="入力" />)
      const input = screen.getByPlaceholderText('入力')
      expect(input.className).toContain('custom-class')
    })
  })

  describe('ユーザーインタラクション', () => {
    it('値の入力ができる', async () => {
      const user = userEvent.setup()
      render(<Input placeholder="入力してください" />)

      const input = screen.getByPlaceholderText('入力してください')
      await user.type(input, 'テスト入力')

      expect(input).toHaveValue('テスト入力')
    })

    it('onChangeイベントが発火する', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()

      render(<Input onChange={handleChange} placeholder="入力" />)
      const input = screen.getByPlaceholderText('入力')

      await user.type(input, 'a')

      expect(handleChange).toHaveBeenCalled()
    })
  })
})
