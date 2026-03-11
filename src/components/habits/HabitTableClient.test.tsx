import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { JSX, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HabitWithProgress } from '@/types/habit'
import { HabitTableClient } from './HabitTableClient'

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: vi.fn(),
  }),
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

vi.mock('./HabitTableActions', () => ({
  HabitTableActions: () => <div data-testid="habit-table-actions" />,
}))

vi.mock('./HabitUnarchiveButton', () => ({
  HabitUnarchiveButton: () => <button type="button">復元</button>,
}))

vi.mock('./HabitDeleteDialog', () => ({
  HabitDeleteDialog: () => <button type="button">完全に削除</button>,
}))

const baseHabit: HabitWithProgress = {
  archived: false,
  archivedAt: null,
  color: null,
  completionRate: 0,
  createdAt: '2026-03-01T00:00:00.000Z',
  currentProgress: 0,
  frequency: 3,
  icon: 'book-open',
  id: 'habit-1',
  name: '読書',
  period: 'daily',
  reminderTime: null,
  skippedToday: false,
  streak: 0,
  updatedAt: '2026-03-01T00:00:00.000Z',
  userId: 'user-1',
}

function renderComponent(habits: HabitWithProgress[] = [baseHabit]) {
  return render(<HabitTableClient habits={habits} />)
}

describe('HabitTableClient', () => {
  beforeEach(() => {
    pushMock.mockClear()
  })

  it('行の非インタラクティブ領域をクリックすると詳細へ遷移する', async () => {
    const user = userEvent.setup()
    renderComponent()

    await user.click(screen.getByText('2026/03/01'))

    expect(pushMock).toHaveBeenCalledWith('/habits/habit-1')
  })

  it('名前リンクを Cmd/Ctrl クリックしても行遷移を発火しない', () => {
    renderComponent()

    fireEvent.click(screen.getByRole('link', { name: '読書' }), { metaKey: true })

    expect(pushMock).not.toHaveBeenCalled()
  })

  it('名前リンクの通常クリックでも行遷移を重複発火しない', async () => {
    const user = userEvent.setup()
    renderComponent()

    await user.click(screen.getByRole('link', { name: '読書' }))

    expect(pushMock).not.toHaveBeenCalled()
  })
})
