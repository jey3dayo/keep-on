import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PeriodSegmentedControl } from './HabitListView'

const SEGMENT_LABELS = ['すべて', 'デイリー', '週次', '月次']

function getSegments() {
  return screen.getAllByRole('radio')
}

describe('PeriodSegmentedControl', () => {
  it('4つのセグメントを1本のradiogroupとして描画する', () => {
    render(<PeriodSegmentedControl onChange={vi.fn()} value="all" />)

    expect(screen.getByRole('radiogroup', { name: '期間で絞り込む' })).toBeInTheDocument()
    expect(getSegments().map((segment) => segment.textContent)).toEqual(SEGMENT_LABELS)
  })

  it('選択中のセグメントだけが aria-checked=true になる', () => {
    render(<PeriodSegmentedControl onChange={vi.fn()} value="weekly" />)

    expect(getSegments().map((segment) => segment.getAttribute('aria-checked'))).toEqual([
      'false',
      'false',
      'true',
      'false',
    ])
  })

  it('選択中のセグメントだけが tabIndex=0 になる（roving tabIndex）', () => {
    render(<PeriodSegmentedControl onChange={vi.fn()} value="daily" />)

    expect(getSegments().map((segment) => segment.tabIndex)).toEqual([-1, 0, -1, -1])
  })

  it.each([
    ['すべて', 'all'],
    ['デイリー', 'daily'],
    ['週次', 'weekly'],
    ['月次', 'monthly'],
  ])('%s をクリックすると onChange に %s が渡る', async (label, expected) => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<PeriodSegmentedControl onChange={onChange} value="all" />)

    await user.click(screen.getByRole('radio', { name: label }))

    expect(onChange).toHaveBeenCalledExactlyOnceWith(expected)
  })

  it('ArrowRight で次のセグメントを選択しフォーカスも移動する', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<PeriodSegmentedControl onChange={onChange} value="all" />)

    await user.click(screen.getByRole('radio', { name: 'すべて' }))
    onChange.mockClear()
    await user.keyboard('{ArrowRight}')

    expect(onChange).toHaveBeenCalledExactlyOnceWith('daily')
    expect(screen.getByRole('radio', { name: 'デイリー' })).toHaveFocus()
  })

  it('ArrowLeft で前のセグメントを選択しフォーカスも移動する', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<PeriodSegmentedControl onChange={onChange} value="weekly" />)

    await user.click(screen.getByRole('radio', { name: '週次' }))
    onChange.mockClear()
    await user.keyboard('{ArrowLeft}')

    expect(onChange).toHaveBeenCalledExactlyOnceWith('daily')
    expect(screen.getByRole('radio', { name: 'デイリー' })).toHaveFocus()
  })

  it('末尾から ArrowRight で先頭へ循環する', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<PeriodSegmentedControl onChange={onChange} value="monthly" />)

    await user.click(screen.getByRole('radio', { name: '月次' }))
    onChange.mockClear()
    await user.keyboard('{ArrowRight}')

    expect(onChange).toHaveBeenCalledExactlyOnceWith('all')
    expect(screen.getByRole('radio', { name: 'すべて' })).toHaveFocus()
  })

  it('先頭から ArrowLeft で末尾へ循環する', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<PeriodSegmentedControl onChange={onChange} value="all" />)

    await user.click(screen.getByRole('radio', { name: 'すべて' }))
    onChange.mockClear()
    await user.keyboard('{ArrowLeft}')

    expect(onChange).toHaveBeenCalledExactlyOnceWith('monthly')
    expect(screen.getByRole('radio', { name: '月次' })).toHaveFocus()
  })
})
