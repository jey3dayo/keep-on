import { render, screen } from '@testing-library/react'
import { format, subDays } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { HabitCalendarHeatmap } from './HabitCalendarHeatmap'

const today = new Date()
const dateKey = (daysAgo: number) => format(subDays(today, daysAgo), 'yyyy-MM-dd')

function renderHeatmap(checkinCounts: Map<string, number>, frequency: number, skipDates: string[] = []) {
  return render(
    <HabitCalendarHeatmap
      accentColor="oklch(0.70 0.18 145)"
      checkinCounts={checkinCounts}
      frequency={frequency}
      months={1}
      skipDates={skipDates}
    />
  )
}

describe('HabitCalendarHeatmap', () => {
  it('チェックイン済みセルのタイトルが count/frequency 形式で表示される', () => {
    const counts = new Map([[dateKey(0), 2]])
    renderHeatmap(counts, 3)

    const cell = screen.getByTitle(`${dateKey(0)} 2/3回`)
    expect(cell).toBeInTheDocument()
  })

  it('frequency=1 で 1 回チェックインしたセルのタイトルが正しい', () => {
    const counts = new Map([[dateKey(1), 1]])
    renderHeatmap(counts, 1)

    expect(screen.getByTitle(`${dateKey(1)} 1/1回`)).toBeInTheDocument()
  })

  it('スキップ日のタイトルが「スキップ」を含む', () => {
    const skipDate = dateKey(2)
    renderHeatmap(new Map(), 1, [skipDate])

    expect(screen.getByTitle(`${skipDate} スキップ`)).toBeInTheDocument()
  })

  it('チェックインがない日のタイトルは日付のみ', () => {
    renderHeatmap(new Map(), 1)

    // 今日のセルが日付のみのタイトルを持つ
    expect(screen.getByTitle(dateKey(0))).toBeInTheDocument()
  })

  it('frequency を超えたカウントでもスタイルが崩れない（クランプ）', () => {
    // frequency=2 に対して count=5（超過）でも表示される
    const counts = new Map([[dateKey(0), 5]])
    renderHeatmap(counts, 2)

    // タイトルに超過カウントが表示される（クランプは色だけ）
    expect(screen.getByTitle(`${dateKey(0)} 5/2回`)).toBeInTheDocument()
  })

  it('凡例に「スキップ」テキストが表示される', () => {
    renderHeatmap(new Map(), 1)
    expect(screen.getByText('スキップ')).toBeInTheDocument()
  })

  it('frequency=1 の凡例は 1/1 回だけを表示する', () => {
    renderHeatmap(new Map(), 1)

    expect(screen.getByTitle('1/1回')).toBeInTheDocument()
    expect(screen.queryByTitle('2/1回')).not.toBeInTheDocument()
    expect(screen.queryByTitle('3/1回')).not.toBeInTheDocument()
  })

  it('凡例は frequency 基準のステップを表示する', () => {
    renderHeatmap(new Map(), 4)

    expect(screen.getByTitle('1/4回')).toBeInTheDocument()
    expect(screen.getByTitle('2/4回')).toBeInTheDocument()
    expect(screen.getByTitle('4/4回')).toBeInTheDocument()
    expect(screen.queryByTitle('3/4回')).not.toBeInTheDocument()
  })

  it('凡例に「未達成」テキストが表示される', () => {
    renderHeatmap(new Map(), 1)
    expect(screen.getByText('未達成')).toBeInTheDocument()
  })

  it('months=2 のとき 2 ヶ月分のラベルが表示される', () => {
    render(
      <HabitCalendarHeatmap accentColor="oklch(0.70 0.18 145)" checkinCounts={new Map()} frequency={1} months={2} />
    )
    // 月ラベルが 2 件あること（「yyyy年M月」形式）
    const monthLabels = screen.getAllByText(/\d{4}年\d+月/)
    expect(monthLabels.length).toBe(2)
  })
})
