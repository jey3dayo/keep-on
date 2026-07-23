import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HabitActionDrawer } from './HabitActionDrawer'

const DELETE_BUTTON_REGEX = /完全に削除/

// mocks
vi.mock('@/components/habits/HabitEditSheet', () => ({
  HabitEditSheet: () => <div data-testid="habit-edit-sheet">HabitEditSheet</div>,
}))

vi.mock('@/components/habits/HabitArchiveDialog', () => ({
  HabitArchiveDialog: () => (
    <button aria-label="アーカイブ" type="button">
      アーカイブ
    </button>
  ),
}))

vi.mock('@/components/habits/HabitDeleteDialog', () => ({
  HabitDeleteDialog: () => (
    <button aria-label="完全削除" type="button">
      削除
    </button>
  ),
}))

const mockHabit = {
  archived: false,
  archivedAt: null,
  color: 'blue',
  completionRate: 37,
  createdAt: new Date('2025-01-01'),
  currentProgress: 3,
  frequency: 8,
  icon: 'droplets' as const,
  id: '1',
  name: '毎日水を8杯飲む',
  period: 'daily' as const,
  streak: 5,
  updatedAt: new Date('2025-01-28'),
  userId: 'user1',
}

describe('HabitActionDrawer', () => {
  describe('レンダリング', () => {
    it('open=trueでDrawerが表示される', async () => {
      render(<HabitActionDrawer habit={mockHabit} onOpenChange={vi.fn()} open />)
      await waitFor(() => {
        expect(screen.getByText('習慣の操作')).toBeInTheDocument()
      })
    })

    it('習慣名が表示される', async () => {
      render(<HabitActionDrawer habit={mockHabit} onOpenChange={vi.fn()} open />)
      await waitFor(() => {
        expect(screen.getByText('毎日水を8杯飲む')).toBeInTheDocument()
      })
    })

    it('編集ボタンが表示される', async () => {
      render(<HabitActionDrawer habit={mockHabit} onOpenChange={vi.fn()} open />)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument()
      })
    })

    it('アーカイブ済みで削除ボタンが表示される', async () => {
      const archivedHabit = { ...mockHabit, archived: true }
      render(<HabitActionDrawer habit={archivedHabit} onOpenChange={vi.fn()} open />)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: DELETE_BUTTON_REGEX })).toBeInTheDocument()
      })
    })
  })

  describe('インタラクション', () => {
    it('編集ボタンクリックでonOpenChangeが呼ばれる', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()

      render(<HabitActionDrawer habit={mockHabit} onOpenChange={handleClose} open />)

      const editButton = await screen.findByRole('button', { name: '編集' })
      await user.click(editButton)

      expect(handleClose).toHaveBeenCalledWith(false)
    })
  })
})
