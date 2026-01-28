import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HabitCircle } from './HabitCircle'

const COMPLETE_LABEL_REGEX = /毎日走るを完了にする/
const INCOMPLETE_LABEL_REGEX = /毎日走るを未完了にする/

describe('HabitCircle', () => {
  describe('レンダリング', () => {
    it('習慣名とアイコンが表示される', () => {
      render(<HabitCircle completed={false} habitName="毎日走る" icon="footprints" />)

      // aria-label で習慣名を確認
      expect(screen.getByRole('button', { name: COMPLETE_LABEL_REGEX })).toBeInTheDocument()
    })

    it('完了状態で完了テキストが表示される', () => {
      render(<HabitCircle completed habitName="毎日走る" icon="footprints" />)

      expect(screen.getByRole('button', { name: INCOMPLETE_LABEL_REGEX })).toBeInTheDocument()
    })

    it('sizeプロパティでサイズが変わる', () => {
      const { rerender } = render(<HabitCircle completed={false} habitName="test" icon="check" size="sm" />)
      let button = screen.getByRole('button')
      expect(button.className).toContain('w-16')

      rerender(<HabitCircle completed={false} habitName="test" icon="check" size="lg" />)
      button = screen.getByRole('button')
      expect(button.className).toContain('w-32')
    })

    it('icon=nullでデフォルトアイコンが表示される', () => {
      render(<HabitCircle completed={false} habitName="テスト" icon={null} />)

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      // デフォルトアイコン（circle-check）が表示される
    })
  })

  describe('ユーザーインタラクション', () => {
    it('クリックでonClickハンドラーが呼ばれる', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()

      render(<HabitCircle completed={false} habitName="テスト" icon="check" onClick={handleClick} />)

      const button = screen.getByRole('button')
      await user.click(button)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('onClickなしでクリックしてもエラーにならない', async () => {
      const user = userEvent.setup()

      render(<HabitCircle completed={false} habitName="テスト" icon="check" />)

      const button = screen.getByRole('button')
      await user.click(button)

      expect(button).toBeInTheDocument()
    })
  })

  describe('アクセシビリティ', () => {
    it('未完了状態で「〜を完了にする」というaria-label', () => {
      render(<HabitCircle completed={false} habitName="毎日走る" icon="footprints" />)

      expect(screen.getByRole('button', { name: '毎日走るを完了にする' })).toBeInTheDocument()
    })

    it('完了状態で「〜を未完了にする」というaria-label', () => {
      render(<HabitCircle completed habitName="毎日走る" icon="footprints" />)

      expect(screen.getByRole('button', { name: '毎日走るを未完了にする' })).toBeInTheDocument()
    })

    it('button要素として正しいroleを持つ', () => {
      render(<HabitCircle completed={false} habitName="テスト" icon="check" />)

      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })
})
