import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useCallback, useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HabitActionDrawer } from './HabitActionDrawer'

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

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
  createdAt: '2025-01-01T00:00:00.000Z',
  currentProgress: 3,
  frequency: 8,
  icon: 'droplets' as const,
  id: '1',
  name: '毎日水を8杯飲む',
  period: 'daily' as const,
  reminderTime: null,
  skippedToday: false,
  streak: 5,
  updatedAt: '2025-01-28T00:00:00.000Z',
  userId: 'user1',
}

const installMatchMedia = (matches: boolean) => {
  vi.mocked(window.matchMedia).mockImplementation((query) => ({
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  }))
}

function ControlledDrawer({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(true)
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen)
      onOpenChange?.(nextOpen)
    },
    [onOpenChange]
  )

  return <HabitActionDrawer habit={mockHabit} onOpenChange={handleOpenChange} open={open} />
}

describe('HabitActionDrawer', () => {
  beforeEach(() => {
    mockPush.mockReset()
    installMatchMedia(false)
  })

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

    it('編集はDrawerのクローズ完了通知まで遷移せず、完了後に1度だけ遷移する', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()

      render(<ControlledDrawer onOpenChange={handleClose} />)

      await user.click(await screen.findByRole('button', { name: '編集' }))

      expect(handleClose).toHaveBeenCalledWith(false)
      expect(mockPush).not.toHaveBeenCalled()

      fireEvent.click(screen.getByTestId('mock-drawer-animation-end-close'))
      expect(mockPush).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith('/habits/1/edit')

      fireEvent.click(screen.getByTestId('mock-drawer-animation-end-close'))
      expect(mockPush).toHaveBeenCalledTimes(1)
    })

    it('クローズ完了通知がない場合もfallbackで遷移する', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

      try {
        render(<ControlledDrawer onOpenChange={handleClose} />)

        await user.click(await screen.findByRole('button', { name: '編集' }))

        expect(mockPush).not.toHaveBeenCalled()
        expect(screen.getByTestId('mock-drawer')).toBeInTheDocument()

        await waitFor(
          () => {
            expect(mockPush).toHaveBeenCalledWith('/habits/1/edit')
          },
          { timeout: 1000 }
        )
        expect(mockPush).toHaveBeenCalledTimes(1)
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('フォールバック遷移'))
      } finally {
        warn.mockRestore()
      }
    })

    it('詳細表示はクローズ完了通知後に正確なパスへ遷移する', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()

      render(<ControlledDrawer onOpenChange={handleClose} />)

      await user.click(await screen.findByRole('button', { name: 'カレンダー履歴を見る' }))

      expect(mockPush).not.toHaveBeenCalled()
      fireEvent.click(screen.getByTestId('mock-drawer-animation-end-close'))

      expect(handleClose).toHaveBeenCalledWith(false)
      expect(mockPush).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith('/habits/1')
    })

    it('オープン完了通知では保留中の遷移を消費しない', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()
      const view = render(<HabitActionDrawer habit={mockHabit} onOpenChange={handleClose} open />)

      await user.click(await screen.findByRole('button', { name: '編集' }))
      expect(mockPush).not.toHaveBeenCalled()

      fireEvent.click(screen.getByTestId('mock-drawer-animation-end-open'))
      expect(mockPush).not.toHaveBeenCalled()

      view.rerender(<HabitActionDrawer habit={mockHabit} onOpenChange={handleClose} open={false} />)
      fireEvent.click(screen.getByTestId('mock-drawer-animation-end-close'))
      expect(mockPush).toHaveBeenCalledWith('/habits/1/edit')
    })

    it('reduced-motionではクローズ完了通知を待たずに遷移する', async () => {
      installMatchMedia(true)
      const user = userEvent.setup()
      const handleClose = vi.fn()

      render(<ControlledDrawer onOpenChange={handleClose} />)

      await user.click(await screen.findByRole('button', { name: '編集' }))

      expect(handleClose).toHaveBeenCalledWith(false)
      expect(mockPush).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith('/habits/1/edit')
    })
  })
})
