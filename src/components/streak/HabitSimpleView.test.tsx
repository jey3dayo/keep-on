import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { HabitWithProgress } from '@/types/habit'
import { HabitSimpleView } from './HabitSimpleView'

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}))

const createHabit = (index: number): HabitWithProgress => ({
  archived: false,
  archivedAt: null,
  color: 'blue',
  completionRate: 0,
  createdAt: '2026-03-01T00:00:00.000Z',
  currentProgress: 0,
  frequency: 1,
  icon: 'book-open',
  id: `habit-${index}`,
  name: `習慣${index}`,
  period: 'daily',
  reminderTime: null,
  skippedToday: false,
  streak: 0,
  updatedAt: '2026-03-01T00:00:00.000Z',
  userId: 'user-1',
})

const renderHabitSimpleView = (habitCount: number) => {
  const habits = Array.from({ length: habitCount }, (_, index) => createHabit(index + 1))
  return render(
    <HabitSimpleView
      completedHabitIds={new Set()}
      habits={habits}
      onAddHabit={vi.fn()}
      todayActive={0}
      totalDaily={habitCount}
    />
  )
}

const getPageForHabit = (habitName: string): HTMLElement => {
  const page = screen.getByText(habitName).closest('[aria-hidden]')
  if (!(page instanceof HTMLElement)) {
    throw new Error(`習慣 ${habitName} のページが見つかりません`)
  }
  return page
}

describe('HabitSimpleView のページキーボード操作', () => {
  it('7件以上の習慣でArrowRightを押すと次ページを表示する', () => {
    renderHabitSimpleView(7)
    const container = screen.getByRole('group', { name: '習慣ページ' })

    fireEvent.keyDown(container, { key: 'ArrowRight' })

    expect(getPageForHabit('習慣1')).toHaveAttribute('aria-hidden', 'true')
    expect(getPageForHabit('習慣1')).toHaveAttribute('inert')
    expect(getPageForHabit('習慣7')).toHaveAttribute('aria-hidden', 'false')
    expect(getPageForHabit('習慣7')).not.toHaveAttribute('inert')
  })

  it('最終ページでArrowRightを押しても表示ページを変えない', () => {
    renderHabitSimpleView(7)
    const container = screen.getByRole('group', { name: '習慣ページ' })

    fireEvent.keyDown(container, { key: 'ArrowRight' })
    fireEvent.keyDown(container, { key: 'ArrowRight' })

    expect(getPageForHabit('習慣1')).toHaveAttribute('aria-hidden', 'true')
    expect(getPageForHabit('習慣7')).toHaveAttribute('aria-hidden', 'false')
  })

  it('ArrowLeftで前ページへ戻れる', () => {
    renderHabitSimpleView(7)
    const container = screen.getByRole('group', { name: '習慣ページ' })

    fireEvent.keyDown(container, { key: 'ArrowRight' })
    fireEvent.keyDown(container, { key: 'ArrowLeft' })

    expect(getPageForHabit('習慣1')).toHaveAttribute('aria-hidden', 'false')
    expect(getPageForHabit('習慣7')).toHaveAttribute('aria-hidden', 'true')
  })

  it('1ページだけのときはコンテナをフォーカス停留所にしない', () => {
    renderHabitSimpleView(6)
    const container = screen.getByRole('group', { name: '習慣ページ' })

    expect(container).not.toHaveAttribute('tabindex')
  })
})
