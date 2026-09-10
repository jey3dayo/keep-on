import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { format, subDays } from 'date-fns'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HabitCalendarHeatmap } from './HabitCalendarHeatmap'

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }))

vi.mock('@/app/actions/habits/checkin', () => ({
  addCheckinAction: vi.fn(),
}))

vi.mock('@/app/actions/habits/clear-checkin', () => ({
  clearCheckinAction: vi.fn(),
}))

vi.mock('@/app/actions/habits/skip', () => ({
  removeSkipAction: vi.fn(),
}))

vi.mock('@/lib/utils/toast', () => ({
  appToast: {
    action: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}))

import { addCheckinAction } from '@/app/actions/habits/checkin'
import { clearCheckinAction } from '@/app/actions/habits/clear-checkin'
import { removeSkipAction } from '@/app/actions/habits/skip'
import { appToast } from '@/lib/utils/toast'

/** scheduleRefresh のデバウンス（500ms）を過ぎさせ、保留中の setTimeout を発火させる */
async function flushRefreshTimer() {
  await act(async () => {
    vi.advanceTimersByTime(600)
    // setTimeout コールバック内の startTransition/state 更新をコミットさせる
    await Promise.resolve()
  })
}

// 実行日の `new Date()` に依存すると、月初（1〜3日）に実行したときだけ dateKey が
// 衝突したり、月内に収まらなくなったりする flake が発生する（実測: 実行日を
// 2026-09-01/02/03/10 に固定して helper の出力を比較すると、旧実装は月初ほど
// distinct な日数が減り、1日には全て同じ dateKey に潰れていた）。
// テストの基準日は「月の中頃」に固定し、実行日に一切依存しないようにする。
const today = new Date(2026, 8, 15) // 2026-09-15（15日固定。月初/月末の影響を受けない）
const todayDateKey = format(today, 'yyyy-MM-dd')
// months={1} で当月グリッドだけを描画するため、当月内（1日〜14日）に収まるようクランプする。
// today が固定されているため、この clamp は実行日に関わらず常に同じ dateKey を返す。
const dateKey = (daysAgo: number) => format(subDays(today, Math.min(daysAgo, today.getDate() - 1)), 'yyyy-MM-dd')

const DEFAULT_HABIT_ID = 'habit-1'

function renderHeatmap(
  checkinCounts: Map<string, number>,
  frequency: number,
  skipDates: string[] = [],
  overrides: {
    archived?: boolean
    habitId?: string
    months?: number
    period?: 'daily' | 'monthly' | 'weekly'
    weekStartDay?: 0 | 1
  } = {}
) {
  return render(
    <HabitCalendarHeatmap
      accentColor="oklch(0.70 0.18 145)"
      archived={overrides.archived}
      checkinCounts={checkinCounts}
      frequency={frequency}
      habitId={overrides.habitId ?? DEFAULT_HABIT_ID}
      months={overrides.months ?? 1}
      period={overrides.period}
      skipDates={skipDates}
      todayDateKey={todayDateKey}
      weekStartDay={overrides.weekStartDay}
    />
  )
}

describe('HabitCalendarHeatmap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(addCheckinAction).mockResolvedValue({ data: { created: true, currentCount: 1 }, ok: true })
    vi.mocked(clearCheckinAction).mockResolvedValue({ data: { deleted: true, deletedCount: 1 }, ok: true })
    vi.mocked(removeSkipAction).mockResolvedValue({ data: undefined, ok: true })
  })

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
      <HabitCalendarHeatmap
        accentColor="oklch(0.70 0.18 145)"
        checkinCounts={new Map()}
        frequency={1}
        habitId={DEFAULT_HABIT_ID}
        months={2}
        todayDateKey={todayDateKey}
      />
    )
    // 月ラベルが 2 件あること（「yyyy年M月」形式）
    const monthLabels = screen.getAllByText(/\d{4}年\d+月/)
    expect(monthLabels.length).toBe(2)
  })

  describe('タップの無効化', () => {
    it('未来日のセルは disabled になる', () => {
      // 当月内で今日より後の日（存在すれば）を対象にする。月末近辺で今日を迎えた場合は
      // 翌月分を含む months=2 で確実に未来日セルを確保する
      render(
        <HabitCalendarHeatmap
          accentColor="oklch(0.70 0.18 145)"
          checkinCounts={new Map()}
          frequency={1}
          habitId={DEFAULT_HABIT_ID}
          months={1}
          todayDateKey={todayDateKey}
        />
      )
      const futureDateKey = format(new Date(today.getFullYear(), today.getMonth() + 1, 1), 'yyyy-MM-dd')
      // 翌月1日は当月グリッドの末尾パディングとして現れる（isCurrentMonth=false かつ isFuture=true）ので
      // isCurrentMonth=false の無効化条件と合わせて確認する
      const cell = screen.queryByTitle(futureDateKey)
      if (cell) {
        expect(cell).toBeDisabled()
      }
    })

    it('前月からのはみ出しセル（月外）は disabled になる', () => {
      renderHeatmap(new Map(), 1)
      // 当月1日より前の日は前月からのはみ出しセルとして存在しうる
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      if (firstOfMonth.getDay() !== 1) {
        const spillover = format(subDays(firstOfMonth, 1), 'yyyy-MM-dd')
        const cell = screen.getByTitle(spillover)
        expect(cell).toBeDisabled()
      }
    })

    it('archived な習慣はすべてのセルが disabled になる', () => {
      renderHeatmap(new Map(), 1, [], { archived: true })

      const cell = screen.getByTitle(dateKey(0))
      expect(cell).toBeDisabled()
    })

    it('365日より前の日付は disabled になる', () => {
      // 固定の todayDateKey を使い、13ヶ月分描画して -366日のセルを確実に含める
      const fixedToday = '2026-09-10'
      render(
        <HabitCalendarHeatmap
          accentColor="oklch(0.70 0.18 145)"
          checkinCounts={new Map()}
          frequency={1}
          habitId={DEFAULT_HABIT_ID}
          months={13}
          todayDateKey={fixedToday}
        />
      )

      // 2025-09-01 は fixedToday（2026-09-10）から374日前で許容ウィンドウ（365日）外
      const outOfWindowCell = screen.getByTitle('2025-09-01')
      expect(outOfWindowCell).toBeDisabled()

      // 対照として、ウィンドウ内の当月セルは disabled ではない
      const withinWindowCell = screen.getByTitle(fixedToday)
      expect(withinWindowCell).not.toBeDisabled()
    })
  })

  describe('セルタップの挙動', () => {
    it('未達成セルをタップすると addCheckinAction がそのセルの dateKey で呼ばれる', async () => {
      const targetDate = dateKey(1)
      renderHeatmap(new Map(), 3)

      fireEvent.click(screen.getByTitle(targetDate))

      await waitFor(() => {
        expect(addCheckinAction).toHaveBeenCalledTimes(1)
      })
      const [calledHabitId, calledDateKey, calledOpId] = vi.mocked(addCheckinAction).mock.calls[0] ?? []
      expect(calledHabitId).toBe(DEFAULT_HABIT_ID)
      expect(calledDateKey).toBe(targetDate)
      expect(typeof calledOpId).toBe('string')
      expect(calledOpId).toBeTruthy()
    })

    it('タップごとに異なる opId が addCheckinAction へ渡される', async () => {
      const targetDate = dateKey(1)
      const { rerender } = renderHeatmap(new Map(), 3)

      fireEvent.click(screen.getByTitle(targetDate))
      await waitFor(() => expect(addCheckinAction).toHaveBeenCalledTimes(1))

      rerender(
        <HabitCalendarHeatmap
          accentColor="oklch(0.70 0.18 145)"
          checkinCounts={new Map([[targetDate, 1]])}
          frequency={3}
          habitId={DEFAULT_HABIT_ID}
          months={1}
          todayDateKey={todayDateKey}
        />
      )
      fireEvent.click(screen.getByTitle(`${targetDate} 1/3回`))
      await waitFor(() => expect(addCheckinAction).toHaveBeenCalledTimes(2))

      const firstOpId = vi.mocked(addCheckinAction).mock.calls[0]?.[2]
      const secondOpId = vi.mocked(addCheckinAction).mock.calls[1]?.[2]
      expect(firstOpId).not.toBe(secondOpId)
    })

    it('frequency に達したセルをタップすると clearCheckinAction が呼ばれ、成功時にセルが未達成へ戻る', async () => {
      const targetDate = dateKey(1)
      renderHeatmap(new Map([[targetDate, 2]]), 2)

      fireEvent.click(screen.getByTitle(`${targetDate} 2/2回`))

      await waitFor(() => {
        expect(clearCheckinAction).toHaveBeenCalledWith(DEFAULT_HABIT_ID, targetDate)
      })
      await waitFor(() => {
        expect(screen.getByTitle(targetDate)).toBeInTheDocument()
      })
    })

    it('clearCheckinAction が失敗した場合はセルの表示が元のカウントへロールバックされる', async () => {
      vi.mocked(clearCheckinAction).mockResolvedValue({
        error: { message: 'boom', name: 'DatabaseError' },
        ok: false,
      })
      const targetDate = dateKey(1)
      renderHeatmap(new Map([[targetDate, 2]]), 2)

      fireEvent.click(screen.getByTitle(`${targetDate} 2/2回`))

      await waitFor(() => {
        expect(clearCheckinAction).toHaveBeenCalled()
      })
      await waitFor(() => {
        expect(screen.getByTitle(`${targetDate} 2/2回`)).toBeInTheDocument()
      })
      expect(appToast.error).toHaveBeenCalled()
    })

    it('addCheckinAction が created:false を返した場合はセルの表示が元のカウントへロールバックされ、上限到達がユーザーへ通知される', async () => {
      vi.mocked(addCheckinAction).mockResolvedValue({ data: { created: false, currentCount: 3 }, ok: true })
      const targetDate = dateKey(1)
      renderHeatmap(new Map([[targetDate, 1]]), 3)

      fireEvent.click(screen.getByTitle(`${targetDate} 1/3回`))

      await waitFor(() => {
        expect(addCheckinAction).toHaveBeenCalled()
      })
      await waitFor(() => {
        expect(screen.getByTitle(`${targetDate} 1/3回`)).toBeInTheDocument()
      })
      expect(appToast.error).toHaveBeenCalled()
    })

    it('スキップ日をタップすると removeSkipAction が呼ばれ、成功時にスキップ表示が解除される', async () => {
      const targetDate = dateKey(2)
      renderHeatmap(new Map(), 1, [targetDate])

      fireEvent.click(screen.getByTitle(`${targetDate} スキップ`))

      await waitFor(() => {
        expect(removeSkipAction).toHaveBeenCalledWith(DEFAULT_HABIT_ID, targetDate)
      })
      await waitFor(() => {
        expect(screen.getByTitle(targetDate)).toBeInTheDocument()
      })
    })

    it('スキップ解除が失敗した場合はスキップ表示のままになる', async () => {
      vi.mocked(removeSkipAction).mockResolvedValue({
        error: { message: 'boom', name: 'DatabaseError' },
        ok: false,
      })
      const targetDate = dateKey(2)
      renderHeatmap(new Map(), 1, [targetDate])

      fireEvent.click(screen.getByTitle(`${targetDate} スキップ`))

      await waitFor(() => {
        expect(removeSkipAction).toHaveBeenCalled()
      })
      await waitFor(() => {
        expect(screen.getByTitle(`${targetDate} スキップ`)).toBeInTheDocument()
      })
      expect(appToast.error).toHaveBeenCalled()
    })

    it('removeSkipActionが例外を投げた場合もエラートーストが表示される', async () => {
      vi.mocked(removeSkipAction).mockRejectedValue(new Error('network error'))
      const targetDate = dateKey(2)
      renderHeatmap(new Map(), 1, [targetDate])

      fireEvent.click(screen.getByTitle(`${targetDate} スキップ`))

      await waitFor(() => {
        expect(removeSkipAction).toHaveBeenCalled()
      })
      await waitFor(() => {
        expect(appToast.error).toHaveBeenCalled()
      })
      // 成功時にしか state を変えないため、スキップ表示は変化しない
      expect(screen.getByTitle(`${targetDate} スキップ`)).toBeInTheDocument()
    })

    it('disabled なセルをタップしてもアクションは呼ばれない', () => {
      renderHeatmap(new Map(), 1, [], { archived: true })

      fireEvent.click(screen.getByTitle(dateKey(0)))

      expect(addCheckinAction).not.toHaveBeenCalled()
      expect(clearCheckinAction).not.toHaveBeenCalled()
      expect(removeSkipAction).not.toHaveBeenCalled()
    })
  })

  describe('チェックインとスキップが両立するセル', () => {
    // createSkip はチェックインを削除せずスキップだけを INSERT するため、両テーブルに
    // 同じ dateKey のレコードが両方存在する状態が通常操作で起こりうる
    // （ダッシュボードで「今日チェックイン → スキップ」の順に操作した場合）。

    it('両立セルをタップすると removeSkipAction が呼ばれ、addCheckinAction / clearCheckinAction は呼ばれない', async () => {
      const targetDate = dateKey(1)
      renderHeatmap(new Map([[targetDate, 2]]), 3, [targetDate])

      fireEvent.click(screen.getByTitle(`${targetDate} 2/3回・スキップ`))

      await waitFor(() => {
        expect(removeSkipAction).toHaveBeenCalledWith(DEFAULT_HABIT_ID, targetDate)
      })
      expect(addCheckinAction).not.toHaveBeenCalled()
      expect(clearCheckinAction).not.toHaveBeenCalled()
    })

    it('上限に達している両立セルでも removeSkipAction が優先される（clearCheckinAction は呼ばれない）', async () => {
      const targetDate = dateKey(1)
      renderHeatmap(new Map([[targetDate, 2]]), 2, [targetDate])

      fireEvent.click(screen.getByTitle(`${targetDate} 2/2回・スキップ`))

      await waitFor(() => {
        expect(removeSkipAction).toHaveBeenCalledWith(DEFAULT_HABIT_ID, targetDate)
      })
      expect(clearCheckinAction).not.toHaveBeenCalled()
      expect(addCheckinAction).not.toHaveBeenCalled()
    })

    it('両立セルのスキップ解除後、再度タップすると通常の循環トグル（add）に戻る', async () => {
      const targetDate = dateKey(1)
      renderHeatmap(new Map([[targetDate, 2]]), 3, [targetDate])

      fireEvent.click(screen.getByTitle(`${targetDate} 2/3回・スキップ`))
      await waitFor(() => expect(removeSkipAction).toHaveBeenCalledTimes(1))
      // スキップ解除後は count はそのまま維持され、スキップ表示だけが消える
      await waitFor(() => {
        expect(screen.getByTitle(`${targetDate} 2/3回`)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTitle(`${targetDate} 2/3回`))
      await waitFor(() => expect(addCheckinAction).toHaveBeenCalledTimes(1))
      expect(clearCheckinAction).not.toHaveBeenCalled()
    })

    it('両立セルの title / aria-label に回数とスキップの両方が含まれる', () => {
      const targetDate = dateKey(1)
      renderHeatmap(new Map([[targetDate, 2]]), 3, [targetDate])

      const cell = screen.getByTitle(`${targetDate} 2/3回・スキップ`)
      expect(cell).toHaveAttribute('aria-label', `${targetDate} 2/3回・スキップ`)
    })

    it('両立セルのスキップ解除が失敗すると、情報表示が両立状態＋スキップ解除ヒントへ戻る', async () => {
      // タップ直後は removeSkip の楽観適用で即座に非スキップ表示になるため、両立状態の
      // ヒントを情報パネルで確認できるのは「解除が失敗して両立状態へ戻った後」になる
      // （テスト339行目付近の「スキップ解除が失敗した場合はスキップ表示のままになる」と同じ形）
      vi.mocked(removeSkipAction).mockResolvedValue({
        error: { message: 'boom', name: 'DatabaseError' },
        ok: false,
      })
      const targetDate = dateKey(1)
      renderHeatmap(new Map([[targetDate, 2]]), 3, [targetDate])

      fireEvent.click(screen.getByTitle(`${targetDate} 2/3回・スキップ`))

      await waitFor(() => {
        expect(removeSkipAction).toHaveBeenCalled()
      })
      await waitFor(() => {
        expect(screen.getByText(/2\/3回・スキップ/)).toBeInTheDocument()
      })
      expect(screen.getByText('タップでスキップを解除')).toBeInTheDocument()
    })
  })

  describe('確定値（props）の再同期と未確定操作の非可換性への対応', () => {
    it('確定値の再同期（refresh 相当）の往復中に発生したタップは消えず、解決後にサーバー値+タップへ収束する', async () => {
      // scheduleRefresh は「タイマー発火時点」でしか pending を見ないため、router.refresh() を
      // 投げてから新しい props（checkinCounts の新しい Map 参照）が届くまでの間に新しいタップが
      // 起きると、旧実装ではその楽観値がサーバーの古い snapshot で消えていた。
      // ここでは「未解決の add が残っている間に props が再同期される」状況を明示的に組む。
      let resolveAdd: ((value: { data: { created: boolean; currentCount: number }; ok: true }) => void) | null = null
      vi.mocked(addCheckinAction).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveAdd = resolve
          })
      )
      const targetDate = dateKey(1)
      const { rerender } = renderHeatmap(new Map(), 1)

      // タップ（add）を発行するが、サーバー応答はまだ返らない
      fireEvent.click(screen.getByTitle(targetDate))
      expect(screen.getByTitle(`${targetDate} 1/1回`)).toBeInTheDocument()

      // その最中に、サーバーから「まだこのタップを反映していない」古い snapshot が
      // 新しい Map 参照として届く（refresh の往復中に典型的に起こる）
      rerender(
        <HabitCalendarHeatmap
          accentColor="oklch(0.70 0.18 145)"
          checkinCounts={new Map()}
          frequency={1}
          habitId={DEFAULT_HABIT_ID}
          months={1}
          todayDateKey={todayDateKey}
        />
      )

      // 進行中のタップは消えず、楽観表示は 1/1 のまま
      expect(screen.getByTitle(`${targetDate} 1/1回`)).toBeInTheDocument()

      // 遅れていた add が成功で解決する
      await act(async () => {
        resolveAdd?.({ data: { created: true, currentCount: 1 }, ok: true })
        await Promise.resolve()
      })

      // 「サーバー値（0）+ そのタップ（+1）」= 1 に収束する
      expect(screen.getByTitle(`${targetDate} 1/1回`)).toBeInTheDocument()
    })

    it('スキップ解除待ちの未確定操作も、確定値の再同期をまたいで消えない', async () => {
      let resolveRemoveSkip: ((value: { data: undefined; ok: true }) => void) | null = null
      vi.mocked(removeSkipAction).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveRemoveSkip = resolve
          })
      )
      const targetDate = dateKey(2)
      const { rerender } = renderHeatmap(new Map(), 1, [targetDate])

      fireEvent.click(screen.getByTitle(`${targetDate} スキップ`))
      // removeSkipAction はまだ解決していないが、楽観表示は即座にスキップ解除される
      expect(screen.queryByTitle(`${targetDate} スキップ`)).not.toBeInTheDocument()
      expect(screen.getByTitle(targetDate)).toBeInTheDocument()

      // サーバーから「まだ解除を反映していない」古い skipDates snapshot（新しい配列参照）が届く
      rerender(
        <HabitCalendarHeatmap
          accentColor="oklch(0.70 0.18 145)"
          checkinCounts={new Map()}
          frequency={1}
          habitId={DEFAULT_HABIT_ID}
          months={1}
          skipDates={[targetDate]}
          todayDateKey={todayDateKey}
        />
      )

      // 未確定の removeSkip 操作が再適用（rebase）され、スキップ解除の見た目は消えない
      expect(screen.queryByTitle(`${targetDate} スキップ`)).not.toBeInTheDocument()
      expect(screen.getByTitle(targetDate)).toBeInTheDocument()

      await act(async () => {
        resolveRemoveSkip?.({ data: undefined, ok: true })
        await Promise.resolve()
      })

      expect(screen.queryByTitle(`${targetDate} スキップ`)).not.toBeInTheDocument()
      expect(screen.getByTitle(targetDate)).toBeInTheDocument()
    })

    describe('snapshot の世代管理（未反映の反映済み判定ができない snapshot を採用しない）', () => {
      beforeEach(() => {
        vi.useFakeTimers()
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      it('(a) 未確定 add が残っている状態で、その add を既に反映した snapshot が届いても二重適用されない', async () => {
        // 実際のバグ: refresh の SSR が「add の INSERT はコミット済みだが client への応答は
        // まだ返っていない」タイミングの DB を読むと、snapshot は既に +1 された値を返す。
        // ここで無条件に確定値へ採用すると、後から届く add の成功応答でもう一度 +1 され、
        // 実際の DB（1件）に対して表示が 2 になってしまう。
        let resolveAdd: ((value: { data: { created: boolean; currentCount: number }; ok: true }) => void) | null = null
        vi.mocked(addCheckinAction).mockImplementation(
          () =>
            new Promise((resolve) => {
              resolveAdd = resolve
            })
        )
        const targetDate = dateKey(1)
        const { rerender } = renderHeatmap(new Map(), 1)

        fireEvent.click(screen.getByTitle(targetDate))
        expect(screen.getByTitle(`${targetDate} 1/1回`)).toBeInTheDocument()

        // まだ add が解決していないのに、その add を既に反映した snapshot（count=1）が届く
        rerender(
          <HabitCalendarHeatmap
            accentColor="oklch(0.70 0.18 145)"
            checkinCounts={new Map([[targetDate, 1]])}
            frequency={1}
            habitId={DEFAULT_HABIT_ID}
            months={1}
            todayDateKey={todayDateKey}
          />
        )
        // 反映済みかどうか分からないため破棄され、二重適用（2/1）にはならない
        expect(screen.getByTitle(`${targetDate} 1/1回`)).toBeInTheDocument()

        await act(async () => {
          resolveAdd?.({ data: { created: true, currentCount: 1 }, ok: true })
          await Promise.resolve()
        })

        // サーバー実値（1件）と一致した 1/1 のまま（2/1 にはならない）
        expect(screen.getByTitle(`${targetDate} 1/1回`)).toBeInTheDocument()
      })

      it('(b) 確定値へ畳み込んだ後、その変更を dispatch 時点より後に届いた古い snapshot が巻き戻さない', async () => {
        const dateA = dateKey(1)
        const dateB = dateKey(2)
        const { rerender } = renderHeatmap(new Map(), 1)

        // 1件目のタップが成功する
        fireEvent.click(screen.getByTitle(dateA))
        await act(async () => {
          await Promise.resolve()
        })
        expect(screen.getByTitle(`${dateA} 1/1回`)).toBeInTheDocument()

        // デバウンスを発火させて refresh を dispatch する（この時点の世代がチェックポイントになる）
        await flushRefreshTimer()
        expect(refreshMock).toHaveBeenCalledTimes(1)

        // その dispatch の応答がまだ返る前に、別セルの2件目のタップが成功する
        fireEvent.click(screen.getByTitle(dateB))
        await act(async () => {
          await Promise.resolve()
        })
        expect(screen.getByTitle(`${dateB} 1/1回`)).toBeInTheDocument()

        // 1件目の dispatch に対する応答（1件目のタップだけを反映した、2件目より古い snapshot）が届く
        rerender(
          <HabitCalendarHeatmap
            accentColor="oklch(0.70 0.18 145)"
            checkinCounts={new Map([[dateA, 1]])}
            frequency={1}
            habitId={DEFAULT_HABIT_ID}
            months={1}
            todayDateKey={todayDateKey}
          />
        )

        // 2件目のタップの確定済み効果は巻き戻らない
        expect(screen.getByTitle(`${dateB} 1/1回`)).toBeInTheDocument()
        expect(screen.getByTitle(`${dateA} 1/1回`)).toBeInTheDocument()
      })

      it('スキップ解除の遅延順序: 確定値へ畳み込んだ後、それを反映していない古い skipDates snapshot が巻き戻さない', async () => {
        const targetDate = dateKey(2)
        const otherDate = dateKey(3)
        const { rerender } = renderHeatmap(new Map(), 1, [targetDate])

        // 別セルへのタップを1件成功させ、refresh を dispatch させておく（チェックポイントを進める）
        fireEvent.click(screen.getByTitle(otherDate))
        await act(async () => {
          await Promise.resolve()
        })
        await flushRefreshTimer()
        expect(refreshMock).toHaveBeenCalledTimes(1)

        // その後スキップ解除タップが成功する
        fireEvent.click(screen.getByTitle(`${targetDate} スキップ`))
        await act(async () => {
          await Promise.resolve()
        })
        expect(screen.getByTitle(targetDate)).toBeInTheDocument()

        // dispatch 時点より後に確定したこの解除を反映していない古い skipDates snapshot が届く
        rerender(
          <HabitCalendarHeatmap
            accentColor="oklch(0.70 0.18 145)"
            checkinCounts={new Map()}
            frequency={1}
            habitId={DEFAULT_HABIT_ID}
            months={1}
            skipDates={[targetDate]}
            todayDateKey={todayDateKey}
          />
        )

        expect(screen.queryByTitle(`${targetDate} スキップ`)).not.toBeInTheDocument()
        expect(screen.getByTitle(targetDate)).toBeInTheDocument()
      })

      it('snapshot を破棄した場合でも、未確定操作が捌けた後に refresh が取り直され最終的に収束する', async () => {
        const dateA = dateKey(1)
        const dateB = dateKey(2)
        const { rerender } = renderHeatmap(new Map(), 1)

        fireEvent.click(screen.getByTitle(dateA))
        await act(async () => {
          await Promise.resolve()
        })
        await flushRefreshTimer()
        expect(refreshMock).toHaveBeenCalledTimes(1)
        refreshMock.mockClear()

        fireEvent.click(screen.getByTitle(dateB))
        await act(async () => {
          await Promise.resolve()
        })

        // 古い（1件目だけ反映した）snapshot が届く → 破棄される
        rerender(
          <HabitCalendarHeatmap
            accentColor="oklch(0.70 0.18 145)"
            checkinCounts={new Map([[dateA, 1]])}
            frequency={1}
            habitId={DEFAULT_HABIT_ID}
            months={1}
            todayDateKey={todayDateKey}
          />
        )

        // 破棄をトリガーに、pending は既に空のため即座に refresh が再スケジュールされる
        await flushRefreshTimer()
        expect(refreshMock).toHaveBeenCalledTimes(1)

        // 今度は両方反映した最新 snapshot が届く → 採用される
        rerender(
          <HabitCalendarHeatmap
            accentColor="oklch(0.70 0.18 145)"
            checkinCounts={
              new Map([
                [dateA, 1],
                [dateB, 1],
              ])
            }
            frequency={1}
            habitId={DEFAULT_HABIT_ID}
            months={1}
            todayDateKey={todayDateKey}
          />
        )
        expect(screen.getByTitle(`${dateA} 1/1回`)).toBeInTheDocument()
        expect(screen.getByTitle(`${dateB} 1/1回`)).toBeInTheDocument()
      })
    })

    it('応答前に add/clear/add を積み、最初の add だけ失敗しても最終表示はサーバー側の結果と一致する', async () => {
      // 失敗した操作は「その時点の楽観値へ delta を適用する」のではなく「未確定操作列から
      // 取り除くだけ」にする設計への回帰テスト。delta 方式（旧実装）だと、この操作列では
      // 最初の add が失敗した時点の楽観値（全タップ適用後の値）から -1 されるため、
      // 後続の clear・add の成功が正しく畳み込まれず、実際の DB 状態（1）と UI（0）が
      // 食い違っていた。
      const targetDate = dateKey(1)
      vi.mocked(addCheckinAction)
        .mockResolvedValueOnce({ error: { message: 'boom', name: 'DatabaseError' }, ok: false })
        .mockResolvedValueOnce({ data: { created: true, currentCount: 1 }, ok: true })
      vi.mocked(clearCheckinAction).mockResolvedValueOnce({ data: { deleted: true, deletedCount: 1 }, ok: true })

      renderHeatmap(new Map([[targetDate, 1]]), 2)

      const cell = screen.getByTitle(`${targetDate} 1/2回`)
      // 1回目: add（失敗する）→ 楽観値 2
      // 2回目: currentCount=2 は frequency に到達しているため clear（成功する）→ 楽観値 0
      // 3回目: currentCount=0 なので add（成功する）→ 楽観値 1
      fireEvent.click(cell)
      fireEvent.click(cell)
      fireEvent.click(cell)

      expect(screen.getByTitle(`${targetDate} 1/2回`)).toBeInTheDocument()

      await waitFor(() => expect(addCheckinAction).toHaveBeenCalledTimes(2))
      await waitFor(() => expect(clearCheckinAction).toHaveBeenCalledTimes(1))

      // 最初の add 失敗後も、後続の clear（成功）・add（成功）の効果がそのまま確定され、
      // サーバー側の最終状態（1件）と一致した 1/2回のままになる
      await waitFor(() => {
        expect(screen.getByTitle(`${targetDate} 1/2回`)).toBeInTheDocument()
      })
      expect(appToast.error).toHaveBeenCalled()
    })

    it('clear が失敗した直後（未解決のうち）に積まれた add は、実サーバー契約どおり上限到達として拒否される', async () => {
      // createCheckinWithLimit（src/lib/queries/checkin.ts）は INSERT を
      // `count(*) < frequency` の WHERE 句で拒否するため、clear が失敗してカウントが
      // 2（frequency と同数）のまま残っている状況での add は created:false を返すのが
      // 実サーバーの挙動である。以前はこのテストが add を無条件成功として mock しており、
      // frequency を超える 3/2 表示を「正しい」と検証してしまっていた（実サーバーでは
      // 起こり得ない状態）。
      const targetDate = dateKey(1)
      let resolveClear: ((value: { error: { message: string; name: 'DatabaseError' }; ok: false }) => void) | null =
        null
      vi.mocked(clearCheckinAction).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveClear = resolve
          })
      )
      vi.mocked(addCheckinAction).mockResolvedValue({ data: { created: false, currentCount: 2 }, ok: true })

      renderHeatmap(new Map([[targetDate, 2]]), 2)

      const cell = screen.getByTitle(`${targetDate} 2/2回`)
      // 1回目: currentCount=2 は frequency 到達 → clear（まだ解決しない）→ 楽観値 0
      fireEvent.click(cell)
      expect(screen.getByTitle(targetDate)).toBeInTheDocument()
      // 2回目: clear がまだ未解決の間に積まれるが、楽観値は既に 0 になっているため add と判定される
      fireEvent.click(cell)
      expect(screen.getByTitle(`${targetDate} 1/2回`)).toBeInTheDocument()

      // taskChainsRef のチェーンが実際に runTask(op1) を起動し、clearCheckinAction を呼んで
      // resolveClear が捕捉されるまでマイクロタスクを進める
      await act(async () => {
        await Promise.resolve()
      })
      await waitFor(() => expect(clearCheckinAction).toHaveBeenCalledTimes(1))

      // clear を失敗させて解決する
      await act(async () => {
        resolveClear?.({ error: { message: 'boom', name: 'DatabaseError' }, ok: false })
        await Promise.resolve()
      })
      await waitFor(() => expect(addCheckinAction).toHaveBeenCalledTimes(1))

      // clear は失敗（確定値は元の 2 のまま）、add も created:false（上限到達）で確定値に反映されない
      // ため、最終的にはどちらの操作も確定値を変えず 2/2 のままになる
      await waitFor(() => {
        expect(screen.getByTitle(`${targetDate} 2/2回`)).toBeInTheDocument()
      })
      expect(appToast.error).toHaveBeenCalled()
    })

    it('clear の応答だけが失敗した場合、後続のサーバー再同期で実際の削除結果へ収束する', async () => {
      // 「DB からは消えたが応答だけ失敗した」（ネットワークエラー等でレスポンスが届かなかった）
      // ケースは、同一操作の再送では検証できない。ロールバック後の確定値が、次に届く
      // サーバー snapshot（実際の削除結果を反映したもの）で正しく上書きされることを確認する。
      vi.mocked(clearCheckinAction).mockResolvedValue({
        error: { message: 'network error', name: 'DatabaseError' },
        ok: false,
      })
      const targetDate = dateKey(1)
      const { rerender } = renderHeatmap(new Map([[targetDate, 2]]), 2)

      fireEvent.click(screen.getByTitle(`${targetDate} 2/2回`))
      await waitFor(() => expect(clearCheckinAction).toHaveBeenCalled())
      // 応答が失敗として扱われるため、いったんは元のカウント（2）へロールバックされる
      await waitFor(() => {
        expect(screen.getByTitle(`${targetDate} 2/2回`)).toBeInTheDocument()
      })

      // pending は既に空になっているため、実際の削除結果（0件）を反映した新しい snapshot は
      // そのまま採用される
      rerender(
        <HabitCalendarHeatmap
          accentColor="oklch(0.70 0.18 145)"
          checkinCounts={new Map()}
          frequency={2}
          habitId={DEFAULT_HABIT_ID}
          months={1}
          todayDateKey={todayDateKey}
        />
      )

      expect(screen.getByTitle(targetDate)).toBeInTheDocument()
    })

    it('created:false を含む操作列でも、成功した操作の効果だけが正しく確定される', async () => {
      const targetDate = dateKey(1)
      vi.mocked(addCheckinAction)
        .mockResolvedValueOnce({ data: { created: true, currentCount: 1 }, ok: true })
        .mockResolvedValueOnce({ data: { created: false, currentCount: 1 }, ok: true })
        .mockResolvedValueOnce({ data: { created: true, currentCount: 2 }, ok: true })

      renderHeatmap(new Map(), 5)

      const cell = screen.getByTitle(dateKey(1))
      fireEvent.click(cell)
      fireEvent.click(cell)
      fireEvent.click(cell)

      // 楽観値は即座に 3
      expect(cell).toHaveAttribute('title', `${targetDate} 3/5回`)

      await waitFor(() => expect(addCheckinAction).toHaveBeenCalledTimes(3))

      // 2回目が created:false（上限到達）で確定値へ畳み込まれないため、最終的には 1+1=2 に収束する
      await waitFor(() => {
        expect(screen.getByTitle(`${targetDate} 2/5回`)).toBeInTheDocument()
      })
      expect(appToast.error).toHaveBeenCalled()
    })
  })

  describe('連打のキュー処理（進行中のセルへの再タップを破棄しない）', () => {
    it('同一セルをN回連打すると、サーバー応答を待たずに楽観カウントがN増える', () => {
      // addCheckinAction は解決させず未確定のままにする（連打の取りこぼしがないかを見るため）
      vi.mocked(addCheckinAction).mockImplementation(() => new Promise(() => undefined))
      const targetDate = dateKey(1)
      renderHeatmap(new Map(), 5)

      const cell = screen.getByTitle(targetDate)
      fireEvent.click(cell)
      fireEvent.click(cell)
      fireEvent.click(cell)

      // フラッシュ前（同期的な楽観更新の時点）で 3 回ぶん反映されていること
      expect(cell).toHaveAttribute('title', `${targetDate} 3/5回`)
    })

    it('同一セルをN回連打すると、addCheckinActionがN回呼ばれる（取りこぼされない）', async () => {
      const targetDate = dateKey(1)
      renderHeatmap(new Map(), 5)

      const cell = screen.getByTitle(targetDate)
      fireEvent.click(cell)
      fireEvent.click(cell)
      fireEvent.click(cell)
      fireEvent.click(cell)

      await waitFor(() => {
        expect(addCheckinAction).toHaveBeenCalledTimes(4)
      })
      // 呼ばれたのはすべて同じセルの dateKey
      for (const call of vi.mocked(addCheckinAction).mock.calls) {
        expect(call[1]).toBe(targetDate)
      }
    })

    it('上限に達している状態でタップすると、その日のカウントが0へ戻る（clearCheckinAction）', async () => {
      const targetDate = dateKey(1)
      renderHeatmap(new Map([[targetDate, 2]]), 2)

      fireEvent.click(screen.getByTitle(`${targetDate} 2/2回`))

      // フラッシュ前でも即座に未達成表示へ戻る
      expect(screen.getByTitle(targetDate)).toBeInTheDocument()

      await waitFor(() => {
        expect(clearCheckinAction).toHaveBeenCalledWith(DEFAULT_HABIT_ID, targetDate)
      })
    })

    it('連打の途中1件だけ失敗しても、そのタップ分だけロールバックされ他は反映されたままになる', async () => {
      const targetDate = dateKey(1)
      vi.mocked(addCheckinAction)
        .mockResolvedValueOnce({ data: { created: true, currentCount: 1 }, ok: true })
        .mockResolvedValueOnce({ error: { message: 'boom', name: 'DatabaseError' }, ok: false })
        .mockResolvedValueOnce({ data: { created: true, currentCount: 3 }, ok: true })
      renderHeatmap(new Map(), 5)

      const cell = screen.getByTitle(targetDate)
      fireEvent.click(cell)
      fireEvent.click(cell)
      fireEvent.click(cell)

      // 3回連打したので楽観値は即座に3
      expect(cell).toHaveAttribute('title', `${targetDate} 3/5回`)

      await waitFor(() => {
        expect(addCheckinAction).toHaveBeenCalledTimes(3)
      })
      // 2回目だけ失敗したので、そのぶん(-1)だけロールバックされ 3-1=2 に収束する
      await waitFor(() => {
        expect(screen.getByTitle(`${targetDate} 2/5回`)).toBeInTheDocument()
      })
      expect(appToast.error).toHaveBeenCalled()
    })
  })

  describe('同一画面の統計反映（router.refresh）', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('チェックイン追加が成功すると、デバウンス後に router.refresh が呼ばれる', async () => {
      const targetDate = dateKey(1)
      renderHeatmap(new Map(), 3)

      fireEvent.click(screen.getByTitle(targetDate))
      // addCheckinAction のモックPromiseを解決させる（マイクロタスクのフラッシュ）
      await act(async () => {
        await Promise.resolve()
      })

      expect(refreshMock).not.toHaveBeenCalled()

      await flushRefreshTimer()

      expect(refreshMock).toHaveBeenCalledTimes(1)
    })

    it('addCheckinAction が書き込み前に確定拒否された（AuthorizationError）場合は router.refresh を呼ばない', async () => {
      // AuthorizationError は runTimedHabitAction 内でミューテーション実行前の
      // 認可段階でしか発生しないため、書き込みが起きていないことが確定している。
      // このケースではサーバーとの食い違いが生じないため再同期は不要。
      vi.mocked(addCheckinAction).mockResolvedValue({
        error: { message: 'forbidden', name: 'AuthorizationError' },
        ok: false,
      })
      const targetDate = dateKey(1)
      renderHeatmap(new Map(), 3)

      fireEvent.click(screen.getByTitle(targetDate))
      await act(async () => {
        await Promise.resolve()
      })

      await flushRefreshTimer()

      expect(refreshMock).not.toHaveBeenCalled()
    })

    it('成功タップでrouter.refreshが走った後でも、同一マウント内の書き込み未確定な失敗タップではrouter.refreshを呼ばない', async () => {
      // 過去に一度でも scheduleRefresh が呼ばれた（成功した）ことをもって、以後のあらゆる
      // pending 解消（書き込み未確定の失敗を含む）で再スケジュールしてしまう回帰を防ぐテスト。
      const successDate = dateKey(1)
      const failureDate = dateKey(2)
      renderHeatmap(new Map(), 3)

      // 1回目: 成功 → デバウンス後に refresh が走る
      fireEvent.click(screen.getByTitle(successDate))
      await act(async () => {
        await Promise.resolve()
      })
      await flushRefreshTimer()
      expect(refreshMock).toHaveBeenCalledTimes(1)

      refreshMock.mockClear()

      // 2回目: 書き込みが起きていないと確定している失敗（AuthorizationError）→ refresh は呼ばれないはず
      vi.mocked(addCheckinAction).mockResolvedValue({
        error: { message: 'forbidden', name: 'AuthorizationError' },
        ok: false,
      })
      fireEvent.click(screen.getByTitle(failureDate))
      await act(async () => {
        await Promise.resolve()
      })
      await flushRefreshTimer()

      expect(refreshMock).not.toHaveBeenCalled()
    })

    it('書き込み結果が不明な失敗（DatabaseError）の後、実装自身がrefreshを起動し、届いたsnapshotがサーバー実値へ収束する', async () => {
      vi.mocked(addCheckinAction).mockResolvedValue({
        error: { message: 'boom', name: 'DatabaseError' },
        ok: false,
      })
      const targetDate = dateKey(1)
      const { rerender } = renderHeatmap(new Map(), 3)

      fireEvent.click(screen.getByTitle(targetDate))
      await act(async () => {
        await Promise.resolve()
      })

      await flushRefreshTimer()
      // 実装が自ら refresh を起動したことの証拠。ここを確認する前に rerender してはいけない
      // （rerender だけで「サーバー値へ収束した」とみなさないため）
      expect(refreshMock).toHaveBeenCalledTimes(1)

      // router.refresh() が実際にサーバーから新しい snapshot を取得した結果を模する
      // （サーバー側では実は書き込みが成功していた、というシナリオ）
      rerender(
        <HabitCalendarHeatmap
          accentColor="oklch(0.70 0.18 145)"
          checkinCounts={new Map([[targetDate, 1]])}
          frequency={3}
          habitId={DEFAULT_HABIT_ID}
          months={1}
          skipDates={[]}
          todayDateKey={todayDateKey}
        />
      )

      // props → state の同期は render 中に行われるため、rerender が返った時点で
      // 既に DOM へ反映されている（waitFor は不要。fake timers 下では待っても進まない）
      expect(screen.getByTitle(`${targetDate} 1/3回`)).toBeInTheDocument()
    })

    it('addCheckinAction が例外を投げた（通信断等）場合も、実装自身がrefreshを起動する', async () => {
      vi.mocked(addCheckinAction).mockRejectedValue(new Error('network error'))
      const targetDate = dateKey(1)
      renderHeatmap(new Map(), 3)

      fireEvent.click(screen.getByTitle(targetDate))
      await act(async () => {
        await Promise.resolve()
      })

      await flushRefreshTimer()

      expect(refreshMock).toHaveBeenCalledTimes(1)
    })

    it('addCheckinAction が created:false（期間上限、書き込みなしが確定）を返した場合は router.refresh を呼ばない', async () => {
      // frequency 未満（2/3）でタップするため enqueueTap は add を選ぶ。それでもサーバー側の
      // 期間（週/月）上限で created:false になり得るケースを想定する
      vi.mocked(addCheckinAction).mockResolvedValue({ data: { created: false, currentCount: 2 }, ok: true })
      const targetDate = dateKey(1)
      renderHeatmap(new Map([[targetDate, 2]]), 3)

      fireEvent.click(screen.getByTitle(`${targetDate} 2/3回`))
      await act(async () => {
        await Promise.resolve()
      })

      await flushRefreshTimer()

      expect(refreshMock).not.toHaveBeenCalled()
    })

    it('進行中のセルが残っている間はrouter.refreshを実行せず、全て完了してから実行する', async () => {
      let resolvePendingAdd: ((value: { data: { created: boolean; currentCount: number }; ok: true }) => void) | null =
        null
      const pendingDate = dateKey(1)
      const settledDate = dateKey(2)

      vi.mocked(addCheckinAction).mockImplementation((_habitId, dateKeyArg) => {
        if (dateKeyArg === pendingDate) {
          return new Promise((resolve) => {
            resolvePendingAdd = resolve
          })
        }
        return Promise.resolve({ data: { created: true, currentCount: 1 }, ok: true })
      })

      renderHeatmap(new Map(), 3)

      // 1つ目: まだ解決しない（pending のまま）
      fireEvent.click(screen.getByTitle(pendingDate))
      // 2つ目: 即座に成功し、scheduleRefresh がセットされる
      fireEvent.click(screen.getByTitle(settledDate))
      await act(async () => {
        await Promise.resolve()
      })

      // デバウンス時間を過ぎても、pendingDate がまだ pending のためリフレッシュは走らない
      await flushRefreshTimer()
      expect(refreshMock).not.toHaveBeenCalled()

      // pending だったタスクを解決する
      await act(async () => {
        resolvePendingAdd?.({ data: { created: true, currentCount: 1 }, ok: true })
        await Promise.resolve()
      })

      // pending が空になったことで再スケジュールされたリフレッシュが走る
      await flushRefreshTimer()
      expect(refreshMock).toHaveBeenCalledTimes(1)
    })

    it('3セル連続タップで、単一チェーンにより投入順(A→B→C)に直列実行され、全て完了するまでrouter.refreshは走らない', async () => {
      // habit 全体を単一チェーンで直列化する変更（PR #204 外部レビュー指摘の P2 対応）により、
      // 別セルへの操作はもはや並行実行されない。以前はこのテストが「登録順と異なる順に解決しても
      // 成立する」ことを検証していたが、単一チェーンでは実行順そのものが登録順に固定されるため、
      // 検証すべき性質は「全タスクが完了するまで refresh を見送る」ことと「投入順どおりに
      // サーバー呼び出しが直列実行される」ことに変わる。
      const dateA = dateKey(1)
      const dateB = dateKey(2)
      const dateC = dateKey(3)
      const resolvers: ((value: { data: { created: boolean; currentCount: number }; ok: true }) => void)[] = []

      vi.mocked(addCheckinAction).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvers.push(resolve)
          })
      )

      renderHeatmap(new Map(), 3)

      // 3セルをほぼ同時にタップする（いずれも即座には解決しない）
      fireEvent.click(screen.getByTitle(dateA))
      fireEvent.click(screen.getByTitle(dateB))
      fireEvent.click(screen.getByTitle(dateC))
      await act(async () => {
        await Promise.resolve()
      })

      // 単一チェーンで直列化されているため、A が解決するまで B・C の addCheckinAction は
      // まだ呼ばれていない
      expect(addCheckinAction).toHaveBeenCalledTimes(1)
      await flushRefreshTimer()
      expect(refreshMock).not.toHaveBeenCalled()

      // A が解決 → チェーンが進み、B の addCheckinAction が呼ばれる
      await act(async () => {
        resolvers[0]?.({ data: { created: true, currentCount: 1 }, ok: true })
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(addCheckinAction).toHaveBeenCalledTimes(2)
      await flushRefreshTimer()
      expect(refreshMock).not.toHaveBeenCalled()

      // B が解決 → チェーンが進み、C の addCheckinAction が呼ばれる
      await act(async () => {
        resolvers[1]?.({ data: { created: true, currentCount: 1 }, ok: true })
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(addCheckinAction).toHaveBeenCalledTimes(3)
      await flushRefreshTimer()
      expect(refreshMock).not.toHaveBeenCalled()

      // 最後に残っていた C が解決 → pending が空になり refresh が取り直されて走る
      await act(async () => {
        resolvers[2]?.({ data: { created: true, currentCount: 1 }, ok: true })
        await Promise.resolve()
      })
      await flushRefreshTimer()
      expect(refreshMock).toHaveBeenCalledTimes(1)

      // 呼び出し順が投入順（A→B→C）どおりであることも確認する
      const calledDateKeys = vi.mocked(addCheckinAction).mock.calls.map((call) => call[1])
      expect(calledDateKeys).toEqual([dateA, dateB, dateC])
    })

    it('アンマウント時に保留中のリフレッシュタイマーを片付ける', async () => {
      const targetDate = dateKey(1)
      const { unmount } = renderHeatmap(new Map(), 3)

      fireEvent.click(screen.getByTitle(targetDate))
      await act(async () => {
        await Promise.resolve()
      })

      unmount()

      await act(async () => {
        vi.advanceTimersByTime(600)
        await Promise.resolve()
      })

      expect(refreshMock).not.toHaveBeenCalled()
    })
  })

  describe('props からの再同期', () => {
    it('checkinCounts に新しい参照が渡されると、local state が最新値へリセットされる', () => {
      const targetDate = dateKey(1)
      const { rerender } = renderHeatmap(new Map([[targetDate, 1]]), 3)

      expect(screen.getByTitle(`${targetDate} 1/3回`)).toBeInTheDocument()

      // サーバーから新しい Map 参照（値も変わっている）が渡ってきたケースを模す
      rerender(
        <HabitCalendarHeatmap
          accentColor="oklch(0.70 0.18 145)"
          checkinCounts={new Map([[targetDate, 3]])}
          frequency={3}
          habitId={DEFAULT_HABIT_ID}
          months={1}
          todayDateKey={todayDateKey}
        />
      )

      expect(screen.getByTitle(`${targetDate} 3/3回`)).toBeInTheDocument()
      expect(screen.queryByTitle(`${targetDate} 1/3回`)).not.toBeInTheDocument()
    })

    it('skipDates に新しい参照が渡されると、local state が最新値へリセットされる', () => {
      const targetDate = dateKey(2)
      const { rerender } = renderHeatmap(new Map(), 1, [targetDate])

      expect(screen.getByTitle(`${targetDate} スキップ`)).toBeInTheDocument()

      // サーバーから新しい配列参照（スキップが解除された状態）が渡ってきたケースを模す
      rerender(
        <HabitCalendarHeatmap
          accentColor="oklch(0.70 0.18 145)"
          checkinCounts={new Map()}
          frequency={1}
          habitId={DEFAULT_HABIT_ID}
          months={1}
          skipDates={[]}
          todayDateKey={todayDateKey}
        />
      )

      expect(screen.queryByTitle(`${targetDate} スキップ`)).not.toBeInTheDocument()
      expect(screen.getByTitle(targetDate)).toBeInTheDocument()
    })
  })

  describe('全削除の undo', () => {
    it('上限到達セルの全削除後、undo アクション付きトーストがその日付・件数で呼ばれる', async () => {
      vi.mocked(clearCheckinAction).mockResolvedValue({ data: { deleted: true, deletedCount: 2 }, ok: true })
      const targetDate = dateKey(1)
      renderHeatmap(new Map([[targetDate, 2]]), 2)

      fireEvent.click(screen.getByTitle(`${targetDate} 2/2回`))

      await waitFor(() => {
        expect(appToast.action).toHaveBeenCalledTimes(1)
      })
      const [message, options] = vi.mocked(appToast.action).mock.calls[0] ?? []
      expect(message).toContain('2件')
      expect(options?.actionLabel).toBe('取り消す')
    })

    it('deletedCount が 0 のとき（全削除しても何も消えていない）は undo トーストを出さない', async () => {
      vi.mocked(clearCheckinAction).mockResolvedValue({ data: { deleted: false, deletedCount: 0 }, ok: true })
      const targetDate = dateKey(1)
      renderHeatmap(new Map([[targetDate, 2]]), 2)

      fireEvent.click(screen.getByTitle(`${targetDate} 2/2回`))

      await waitFor(() => {
        expect(clearCheckinAction).toHaveBeenCalled()
      })
      expect(appToast.action).not.toHaveBeenCalled()
    })

    it('undo アクションを実行すると、削除件数ぶん addCheckinAction がその日付で呼ばれる', async () => {
      vi.mocked(clearCheckinAction).mockResolvedValue({ data: { deleted: true, deletedCount: 3 }, ok: true })
      const targetDate = dateKey(1)
      renderHeatmap(new Map([[targetDate, 3]]), 3)

      fireEvent.click(screen.getByTitle(`${targetDate} 3/3回`))
      await waitFor(() => expect(appToast.action).toHaveBeenCalledTimes(1))

      const options = vi.mocked(appToast.action).mock.calls[0]?.[1]
      await act(async () => {
        options?.onAction()
        await Promise.resolve()
      })

      await waitFor(() => expect(addCheckinAction).toHaveBeenCalledTimes(3))
      for (const call of vi.mocked(addCheckinAction).mock.calls) {
        expect(call[1]).toBe(targetDate)
      }
    })

    it('undo アクションの onAction は1回しか実行されない（二重復元しない）', async () => {
      vi.mocked(clearCheckinAction).mockResolvedValue({ data: { deleted: true, deletedCount: 2 }, ok: true })
      const targetDate = dateKey(1)
      renderHeatmap(new Map([[targetDate, 2]]), 2)

      fireEvent.click(screen.getByTitle(`${targetDate} 2/2回`))
      await waitFor(() => expect(appToast.action).toHaveBeenCalledTimes(1))

      const options = vi.mocked(appToast.action).mock.calls[0]?.[1]
      await act(async () => {
        options?.onAction()
        options?.onAction()
        await Promise.resolve()
      })

      await waitFor(() => expect(addCheckinAction).toHaveBeenCalledTimes(2))
    })

    it('復元の一部が期間上限（created:false）で失敗した場合、その旨を伝えるトーストを表示する', async () => {
      vi.mocked(clearCheckinAction).mockResolvedValue({ data: { deleted: true, deletedCount: 3 }, ok: true })
      vi.mocked(addCheckinAction)
        .mockResolvedValueOnce({ data: { created: true, currentCount: 1 }, ok: true })
        .mockResolvedValueOnce({ data: { created: false, currentCount: 1 }, ok: true })
        .mockResolvedValueOnce({ data: { created: true, currentCount: 2 }, ok: true })

      const targetDate = dateKey(1)
      renderHeatmap(new Map([[targetDate, 3]]), 3)

      fireEvent.click(screen.getByTitle(`${targetDate} 3/3回`))
      await waitFor(() => expect(appToast.action).toHaveBeenCalledTimes(1))
      const options = vi.mocked(appToast.action).mock.calls[0]?.[1]

      await act(async () => {
        options?.onAction()
        await Promise.resolve()
      })

      await waitFor(() => expect(addCheckinAction).toHaveBeenCalledTimes(3))
      await waitFor(() => {
        expect(appToast.info).toHaveBeenCalled()
      })
      // 失敗が全て期間上限（created:false）のときだけ上限到達と断定してよい
      const infoCall = vi.mocked(appToast.info).mock.calls.at(-1)
      expect(infoCall?.join(' ')).toContain('上限')
    })

    it('復元が全て期間上限（created:false）で失敗した場合、復元できなかった旨をエラートーストで伝える', async () => {
      vi.mocked(clearCheckinAction).mockResolvedValue({ data: { deleted: true, deletedCount: 2 }, ok: true })
      vi.mocked(addCheckinAction).mockResolvedValue({ data: { created: false, currentCount: 2 }, ok: true })

      const targetDate = dateKey(1)
      renderHeatmap(new Map([[targetDate, 2]]), 2)

      fireEvent.click(screen.getByTitle(`${targetDate} 2/2回`))
      await waitFor(() => expect(appToast.action).toHaveBeenCalledTimes(1))
      const options = vi.mocked(appToast.action).mock.calls[0]?.[1]

      vi.mocked(appToast.error).mockClear()
      await act(async () => {
        options?.onAction()
        await Promise.resolve()
      })

      await waitFor(() => expect(addCheckinAction).toHaveBeenCalledTimes(2))
      await waitFor(() => {
        expect(appToast.error).toHaveBeenCalled()
      })
      const errorCall = vi.mocked(appToast.error).mock.calls.at(-1)
      expect(errorCall?.[0]).toContain('上限')
    })

    it('復元が全て通信エラー（DatabaseError）で失敗した場合、上限到達を断定する文言は出さない', async () => {
      vi.mocked(clearCheckinAction).mockResolvedValue({ data: { deleted: true, deletedCount: 2 }, ok: true })
      vi.mocked(addCheckinAction).mockResolvedValue({
        error: { message: 'boom', name: 'DatabaseError' },
        ok: false,
      })

      const targetDate = dateKey(1)
      renderHeatmap(new Map([[targetDate, 2]]), 2)

      fireEvent.click(screen.getByTitle(`${targetDate} 2/2回`))
      await waitFor(() => expect(appToast.action).toHaveBeenCalledTimes(1))
      const options = vi.mocked(appToast.action).mock.calls[0]?.[1]

      vi.mocked(appToast.error).mockClear()
      await act(async () => {
        options?.onAction()
        await Promise.resolve()
      })

      await waitFor(() => expect(addCheckinAction).toHaveBeenCalledTimes(2))
      await waitFor(() => {
        expect(appToast.error).toHaveBeenCalled()
      })
      // 原因不明の失敗を「上限に達している」と誤って断定してはいけない
      for (const call of vi.mocked(appToast.error).mock.calls) {
        expect(call.join(' ')).not.toContain('上限')
      }
    })

    it('復元が部分的に成功し、残りの失敗理由が上限到達と通信エラーで混在する場合、成功件数は正しく表示され上限到達を断定しない', async () => {
      vi.mocked(clearCheckinAction).mockResolvedValue({ data: { deleted: true, deletedCount: 3 }, ok: true })
      vi.mocked(addCheckinAction)
        .mockResolvedValueOnce({ data: { created: true, currentCount: 1 }, ok: true })
        .mockResolvedValueOnce({ data: { created: false, currentCount: 1 }, ok: true })
        .mockResolvedValueOnce({ error: { message: 'boom', name: 'DatabaseError' }, ok: false })

      const targetDate = dateKey(1)
      renderHeatmap(new Map([[targetDate, 3]]), 3)

      fireEvent.click(screen.getByTitle(`${targetDate} 3/3回`))
      await waitFor(() => expect(appToast.action).toHaveBeenCalledTimes(1))
      const options = vi.mocked(appToast.action).mock.calls[0]?.[1]

      vi.mocked(appToast.info).mockClear()
      await act(async () => {
        options?.onAction()
        await Promise.resolve()
      })

      await waitFor(() => expect(addCheckinAction).toHaveBeenCalledTimes(3))
      await waitFor(() => {
        expect(appToast.info).toHaveBeenCalled()
      })
      const infoCall = vi.mocked(appToast.info).mock.calls.at(-1)
      // 3件中1件成功、という件数は正しく伝える
      expect(infoCall?.join(' ')).toContain('1/3')
      // 失敗理由が混在する場合は上限到達と断定しない
      expect(infoCall?.join(' ')).not.toContain('上限')
    })

    it('復元中に個別のaddが失敗しても、個別のエラートーストは出さず集約トーストだけを出す（通知の重複防止）', async () => {
      vi.mocked(clearCheckinAction).mockResolvedValue({ data: { deleted: true, deletedCount: 2 }, ok: true })
      vi.mocked(addCheckinAction).mockResolvedValue({
        error: { message: 'boom', name: 'DatabaseError' },
        ok: false,
      })

      const targetDate = dateKey(1)
      renderHeatmap(new Map([[targetDate, 2]]), 2)

      fireEvent.click(screen.getByTitle(`${targetDate} 2/2回`))
      await waitFor(() => expect(appToast.action).toHaveBeenCalledTimes(1))
      const options = vi.mocked(appToast.action).mock.calls[0]?.[1]

      vi.mocked(appToast.error).mockClear()
      await act(async () => {
        options?.onAction()
        await Promise.resolve()
      })

      await waitFor(() => expect(addCheckinAction).toHaveBeenCalledTimes(2))
      await waitFor(() => {
        expect(appToast.error).toHaveBeenCalled()
      })
      // runTask 内の個別エラートースト（チェックインの追加に失敗しました）は出ていないはず
      const individualCalls = vi
        .mocked(appToast.error)
        .mock.calls.filter(([message]) => message === 'チェックインの追加に失敗しました')
      expect(individualCalls).toHaveLength(0)
      // 集約トースト（appToast.error / appToast.info いずれか）は1種類だけ出ている
      const aggregateErrorCalls = vi
        .mocked(appToast.error)
        .mock.calls.filter(([message]) => message !== 'チェックインの追加に失敗しました')
      expect(aggregateErrorCalls.length).toBeGreaterThan(0)
    })

    it('復元処理中に同じ日付へ別のタップが割り込んでも、両方の操作が反映された最終カウントになる', async () => {
      const targetDate = dateKey(1)
      vi.mocked(clearCheckinAction).mockResolvedValue({ data: { deleted: true, deletedCount: 1 }, ok: true })

      let resolveFirstAdd: ((value: { data: { created: boolean; currentCount: number }; ok: true }) => void) | null =
        null
      let addCallCount = 0
      vi.mocked(addCheckinAction).mockImplementation(() => {
        addCallCount += 1
        if (addCallCount === 1) {
          return new Promise((resolve) => {
            resolveFirstAdd = resolve
          })
        }
        return Promise.resolve({ data: { created: true, currentCount: addCallCount }, ok: true })
      })

      renderHeatmap(new Map([[targetDate, 2]]), 2)

      fireEvent.click(screen.getByTitle(`${targetDate} 2/2回`))
      await waitFor(() => expect(clearCheckinAction).toHaveBeenCalled())
      await waitFor(() => expect(screen.getByTitle(targetDate)).toBeInTheDocument())
      await waitFor(() => expect(appToast.action).toHaveBeenCalledTimes(1))
      const options = vi.mocked(appToast.action).mock.calls[0]?.[1]

      // 復元（add）を発行するが、1件目の応答はまだ返らない
      act(() => {
        options?.onAction()
      })

      // taskChainsRef の chain が実際に addCheckinAction（1件目）を呼び出すまでマイクロタスクを進める
      await waitFor(() => expect(addCheckinAction).toHaveBeenCalledTimes(1))

      // 復元が進行中の間に、同じ日付へ別のタップを割り込ませる
      // （復元の pending add が既に反映され表示は 1/2回になっている）
      fireEvent.click(screen.getByTitle(`${targetDate} 1/2回`))

      // 復元中だった1件目を解決する
      await act(async () => {
        resolveFirstAdd?.({ data: { created: true, currentCount: 1 }, ok: true })
        await Promise.resolve()
      })

      await waitFor(() => expect(addCheckinAction).toHaveBeenCalledTimes(2))
      for (const call of vi.mocked(addCheckinAction).mock.calls) {
        expect(call[1]).toBe(targetDate)
      }
      await waitFor(() => {
        expect(screen.getByTitle(`${targetDate} 2/2回`)).toBeInTheDocument()
      })
    })
  })

  describe('カレンダー外の選択中日情報表示', () => {
    it('セルをタップすると、情報表示にその日付の回数が反映される', () => {
      const targetDate = dateKey(1)
      renderHeatmap(new Map([[targetDate, 1]]), 3)

      fireEvent.click(screen.getByTitle(`${targetDate} 1/3回`))

      expect(screen.getByText(/2\/3回/)).toBeInTheDocument()
      expect(screen.getByText('タップで追加')).toBeInTheDocument()
    })

    it('スキップ中のセルをタップしてスキップ解除すると、情報表示がその状態を反映する', () => {
      const targetDate = dateKey(2)
      renderHeatmap(new Map(), 1, [targetDate])

      fireEvent.click(screen.getByTitle(`${targetDate} スキップ`))

      expect(screen.getByText('タップで追加')).toBeInTheDocument()
    })

    it('上限に達しているセルを選択しているとき、次のタップで削除される旨のヒントが表示される', () => {
      const targetDate = dateKey(1)
      renderHeatmap(new Map([[targetDate, 1]]), 2)

      fireEvent.click(screen.getByTitle(`${targetDate} 1/2回`))

      expect(screen.getByText('上限に達しています。次のタップで削除されます')).toBeInTheDocument()
    })

    it('何も操作していないときはプレースホルダ文言が表示される', () => {
      renderHeatmap(new Map(), 1)

      expect(screen.getByText('セルをタップすると、日付と回数がここに表示されます')).toBeInTheDocument()
    })
  })

  describe('期間（週次・月次）を考慮した操作判定', () => {
    // today = 2026-09-15（火）固定。2026-09-07(月)〜09-13(日) は月曜始まりの1つの週で、
    // かつ today より前・当月内に収まるため、週次テストの基準として使う
    // （PR #204 外部レビューの再現条件と同じ曜日構成）。
    const monday = '2026-09-07'
    const tuesday = '2026-09-08'
    const wednesday = '2026-09-09'

    it('週次 frequency=3 で3つの別々の日に1件ずつあるとき、いずれかの日をタップすると期間合計で判定してclearが選ばれ、その日が0になる', async () => {
      const counts = new Map([
        [monday, 1],
        [tuesday, 1],
        [wednesday, 1],
      ])
      renderHeatmap(counts, 3, [], { period: 'weekly' })

      // 火曜だけを見ると 1/3 で未達成に見えるが、週の合計は 3（frequency と同数）のため
      // 削除（clear）が選ばれるべき
      fireEvent.click(screen.getByTitle(`${tuesday} 1/3回`))

      await waitFor(() => {
        expect(clearCheckinAction).toHaveBeenCalledWith(DEFAULT_HABIT_ID, tuesday)
      })
      expect(addCheckinAction).not.toHaveBeenCalled()
      await waitFor(() => {
        expect(screen.getByTitle(tuesday)).toBeInTheDocument()
      })
      // 月曜・水曜は操作対象ではないため変化しない
      expect(screen.getByTitle(`${monday} 1/3回`)).toBeInTheDocument()
      expect(screen.getByTitle(`${wednesday} 1/3回`)).toBeInTheDocument()
    })

    it('clear で期間に空きができた後、同じ日を再度タップするとaddに戻る', async () => {
      const counts = new Map([
        [monday, 1],
        [tuesday, 1],
        [wednesday, 1],
      ])
      renderHeatmap(counts, 3, [], { period: 'weekly' })

      fireEvent.click(screen.getByTitle(`${tuesday} 1/3回`))
      await waitFor(() => expect(clearCheckinAction).toHaveBeenCalledTimes(1))
      await waitFor(() => expect(screen.getByTitle(tuesday)).toBeInTheDocument())

      // 週の合計は 1(月)+0(火)+1(水)=2 < 3 のため、今度は add が選ばれる
      fireEvent.click(screen.getByTitle(tuesday))
      await waitFor(() => expect(addCheckinAction).toHaveBeenCalledWith(DEFAULT_HABIT_ID, tuesday, expect.any(String)))
    })

    it('daily 習慣では他の日にチェックインがあっても期間合計の影響を受けず、従来どおり日別カウントで判定される', async () => {
      // 同じ「週」に他の日のチェックインがあっても daily では無関係（period が daily のときは
      // sumEffectiveCountOverPeriod の期間がその日1日だけになるため）
      const counts = new Map([
        [monday, 1],
        [tuesday, 1],
        [wednesday, 1],
      ])
      renderHeatmap(counts, 3, [], { period: 'daily' })

      // 火曜は 1/3（未達成）なので add が選ばれるはず（週次なら 3/3 で clear になっていたはず）
      fireEvent.click(screen.getByTitle(`${tuesday} 1/3回`))

      await waitFor(() => {
        expect(addCheckinAction).toHaveBeenCalledWith(DEFAULT_HABIT_ID, tuesday, expect.any(String))
      })
      expect(clearCheckinAction).not.toHaveBeenCalled()
    })

    it('月次 frequency=3 でも期間合計（月内の合計）で判定される', async () => {
      const dayA = '2026-09-03'
      const dayB = '2026-09-07'
      const dayC = '2026-09-10'
      const counts = new Map([
        [dayA, 1],
        [dayB, 1],
        [dayC, 1],
      ])
      renderHeatmap(counts, 3, [], { period: 'monthly' })

      fireEvent.click(screen.getByTitle(`${dayB} 1/3回`))

      await waitFor(() => {
        expect(clearCheckinAction).toHaveBeenCalledWith(DEFAULT_HABIT_ID, dayB)
      })
      expect(addCheckinAction).not.toHaveBeenCalled()
    })

    it('期間が満杯でその日のカウントが0のセルをタップするとaddが試みられ、created:falseで上限到達が通知される', async () => {
      vi.mocked(addCheckinAction).mockResolvedValue({ data: { created: false, currentCount: 2 }, ok: true })
      // 週の合計は既に 2（frequency と同数）。火曜(count=0)をタップする
      const counts = new Map([
        [monday, 1],
        [wednesday, 1],
      ])
      renderHeatmap(counts, 2, [], { period: 'weekly' })

      fireEvent.click(screen.getByTitle(tuesday))

      await waitFor(() => {
        expect(addCheckinAction).toHaveBeenCalledWith(DEFAULT_HABIT_ID, tuesday, expect.any(String))
      })
      expect(clearCheckinAction).not.toHaveBeenCalled()
      await waitFor(() => {
        expect(appToast.error).toHaveBeenCalled()
      })
      const errorCall = vi.mocked(appToast.error).mock.calls.at(-1)
      expect(errorCall?.[0]).toContain('上限')
      // created:false のため確定値へは反映されず、0のまま戻る
      await waitFor(() => {
        expect(screen.getByTitle(tuesday)).toBeInTheDocument()
      })
    })

    it('選択日情報の「次の操作」表示が、期間満杯時に削除だと分かる内容になっていること', () => {
      // 週の合計は既に 2（frequency と同数）。火曜(count=0)をタップすると add が選ばれ、
      // 楽観適用後は週の合計が 3 になり期間満杯（isPeriodFull）かつ選択日の count>0 になるため、
      // 情報表示は「次のタップで削除されます」を案内すべき
      const counts = new Map([
        [monday, 1],
        [wednesday, 1],
      ])
      renderHeatmap(counts, 2, [], { period: 'weekly' })

      fireEvent.click(screen.getByTitle(tuesday))

      expect(screen.getByText(/1\/2回/)).toBeInTheDocument()
      expect(screen.getByText('上限に達しています。次のタップで削除されます')).toBeInTheDocument()
    })

    it('同一期間内の別日への操作は投入順（直列）に実行される（月曜clear→火曜add）', async () => {
      let resolveClear: ((value: { data: { deleted: boolean; deletedCount: number }; ok: true }) => void) | null = null
      vi.mocked(clearCheckinAction).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveClear = resolve
          })
      )
      const counts = new Map([
        [monday, 1],
        [tuesday, 1],
        [wednesday, 1],
      ])
      renderHeatmap(counts, 3, [], { period: 'weekly' })

      // 月曜: 週合計 3/3 のため clear が選ばれる（まだ解決しない）
      fireEvent.click(screen.getByTitle(`${monday} 1/3回`))
      await waitFor(() => expect(clearCheckinAction).toHaveBeenCalledTimes(1))

      // 火曜: 月曜の clear が楽観適用済みのため週合計は 0(月)+1(火)+1(水)=2 < 3 となり add が選ばれる
      fireEvent.click(screen.getByTitle(`${tuesday} 1/3回`))

      // 単一チェーンで直列化されているため、月曜の clear が解決するまで火曜の add は呼ばれない
      await act(async () => {
        await Promise.resolve()
      })
      expect(addCheckinAction).not.toHaveBeenCalled()

      await act(async () => {
        resolveClear?.({ data: { deleted: true, deletedCount: 1 }, ok: true })
        await Promise.resolve()
      })

      // 月曜の clear が解決した後にだけ、火曜の add が呼ばれる（投入順どおりの実行）
      await waitFor(() => {
        expect(addCheckinAction).toHaveBeenCalledWith(DEFAULT_HABIT_ID, tuesday, expect.any(String))
      })
    })
  })
})
