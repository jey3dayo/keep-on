import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { HabitWithProgress } from '@/types/habit'
import { PeriodSegmentedControl } from './HabitListView'
import { HabitsListClient } from './HabitsListClient'

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}))

vi.mock('@/hooks/useHabitCheckinQueue', () => ({
  useHabitCheckinQueue: (incomingHabits: HabitWithProgress[]) => ({
    archiveOptimistically: () => () => undefined,
    deleteOptimistically: () => () => undefined,
    handleAddCheckin: async () => undefined,
    handleRemoveCheckin: async () => undefined,
    handleSkip: async () => undefined,
    handleUnSkip: async () => undefined,
    optimisticHabits: incomingHabits,
    resetOptimistically: () => () => undefined,
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const createHabit = (overrides: Partial<HabitWithProgress> = {}): HabitWithProgress => ({
  archived: false,
  archivedAt: null,
  color: 'blue',
  completionRate: 0,
  createdAt: '2026-03-01T00:00:00.000Z',
  currentProgress: 0,
  frequency: 1,
  icon: 'book-open',
  id: 'habit-1',
  name: '読書',
  period: 'daily',
  reminderTime: null,
  skippedToday: false,
  streak: 0,
  updatedAt: '2026-03-01T00:00:00.000Z',
  userId: 'user-1',
  ...overrides,
})

const habits = [
  createHabit(),
  createHabit({
    archived: true,
    archivedAt: '2026-03-02T00:00:00.000Z',
    frequency: 2,
    id: 'habit-2',
    name: 'アーカイブした運動',
  }),
]

describe('HabitsListClient', () => {
  it('すべてではアクティブな習慣だけを表示し、アーカイブ済みフィルターではアーカイブ済みだけを表示する', async () => {
    const user = userEvent.setup()
    render(<HabitsListClient habits={habits} todayLabel="2026年3月1日" />)

    expect(screen.getByRole('heading', { name: '読書' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'アーカイブした運動' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'アーカイブ済み' }))

    expect(screen.queryByRole('heading', { name: '読書' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'アーカイブした運動' })).toBeInTheDocument()
  })

  it('アーカイブ済み行のチェックインと増減ボタンを無効にする', async () => {
    const user = userEvent.setup()
    render(<HabitsListClient habits={habits} todayLabel="2026年3月1日" />)

    await user.click(screen.getByRole('radio', { name: 'アーカイブ済み' }))

    expect(screen.getByRole('button', { name: 'アーカイブした運動をチェックイン' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'チェックインを1つ減らす' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'チェックインを1つ増やす' })).toBeDisabled()
  })
})

describe('HabitListView の期間フィルター', () => {
  it('アーカイブ済みセグメントを矢印キーで移動できる', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PeriodSegmentedControl onChange={onChange} value="archived" />)

    await user.click(screen.getByRole('radio', { name: 'アーカイブ済み' }))
    onChange.mockClear()
    await user.keyboard('{ArrowLeft}')

    expect(onChange).toHaveBeenCalledExactlyOnceWith('monthly')
    expect(screen.getByRole('radio', { name: '月次' })).toHaveFocus()
  })
})
