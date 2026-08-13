import { act, fireEvent, render, screen } from '@testing-library/react'
import { useCallback } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addCheckinAction } from '@/app/actions/habits/checkin'
import { removeCheckinAction } from '@/app/actions/habits/remove-checkin'
import { addSkipAction, removeSkipAction } from '@/app/actions/habits/skip'
import type { DashboardViewProps } from '@/components/streak/types'
import { SyncProvider } from '@/contexts/SyncContext'
import { useOfflineCheckin } from '@/hooks/useOfflineCheckin'
import { appToast } from '@/lib/utils/toast'
import type { HabitWithProgress } from '@/types/habit'
import type { User } from '@/types/user'
import { DashboardWrapper } from './DashboardWrapper'

// DesktopDashboard は md:hidden の兄弟要素と重複するテキストを生むため、
// テストの関心事（DashboardWrapper が渡す挙動）に無関係な描画をゼロにする
vi.mock('@/components/streak/DesktopDashboard', () => ({
  DesktopDashboard: () => null,
}))

// StreakDashboard を「DashboardWrapper が渡す props をそのまま呼び出せる」最小ハーネスに差し替える。
// これにより DashboardWrapper 自体の挙動（楽観的更新・キュー・ロールバック）だけを検証できる。
const renderedProgressSnapshots: number[][] = []

function HabitRow({ habit, props }: { habit: HabitWithProgress; props: DashboardViewProps }) {
  const habitId = habit.id
  const handleAdd = useCallback(() => props.onAddCheckin?.(habitId), [props, habitId])
  const handleRemove = useCallback(() => props.onRemoveCheckin?.(habitId), [props, habitId])
  const handleSkip = useCallback(() => props.onSkip?.(habitId), [props, habitId])
  const handleUnSkip = useCallback(() => props.onUnSkip?.(habitId), [props, habitId])
  const handleReset = useCallback(() => {
    const rollback = props.onResetOptimistic?.(habitId)
    if (rollback) {
      lastResetRollback = rollback
    }
  }, [props, habitId])

  return (
    <div data-testid={`habit-${habit.id}`}>
      <span data-testid={`progress-${habit.id}`}>{habit.currentProgress}</span>
      <span data-testid={`streak-${habit.id}`}>{habit.streak}</span>
      <button onClick={handleAdd} type="button">
        add-{habit.id}
      </button>
      <button onClick={handleRemove} type="button">
        remove-{habit.id}
      </button>
      <button onClick={handleSkip} type="button">
        skip-{habit.id}
      </button>
      <button onClick={handleUnSkip} type="button">
        unskip-{habit.id}
      </button>
      <button onClick={handleReset} type="button">
        reset-{habit.id}
      </button>
    </div>
  )
}

vi.mock('@/components/streak/StreakDashboard', () => ({
  StreakDashboard: (props: DashboardViewProps) => {
    renderedProgressSnapshots.push(props.habits.map((habit) => habit.currentProgress))
    return (
      <div>
        {props.habits.map((habit) => (
          <HabitRow habit={habit} key={habit.id} props={props} />
        ))}
      </div>
    )
  },
}))

vi.mock('@/app/actions/habits/checkin', () => ({
  addCheckinAction: vi.fn(),
}))

vi.mock('@/app/actions/habits/remove-checkin', () => ({
  removeCheckinAction: vi.fn(),
}))

vi.mock('@/app/actions/habits/skip', () => ({
  addSkipAction: vi.fn(),
  removeSkipAction: vi.fn(),
}))

vi.mock('@/hooks/useOfflineCheckin', () => ({
  useOfflineCheckin: vi.fn(() => ({
    enqueueCheckin: vi.fn(),
    isOnline: true,
  })),
}))

vi.mock('@/lib/utils/toast', () => ({
  appToast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}))

let lastResetRollback: (() => void) | undefined

const baseHabit: HabitWithProgress = {
  archived: false,
  archivedAt: null,
  color: 'blue',
  completionRate: 25,
  createdAt: '2025-01-01T00:00:00.000Z',
  currentProgress: 1,
  frequency: 4,
  icon: 'droplets',
  id: 'habit-1',
  name: '水を飲む',
  period: 'daily',
  reminderTime: null,
  skippedToday: false,
  streak: 3,
  updatedAt: '2025-01-01T00:00:00.000Z',
  userId: 'user-1',
}

const mockUser: User = {
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  email: 'test@example.com',
  externalId: 'access-sub-1',
  id: 'user-1',
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  weekStart: 'sunday',
}

function renderDashboard(habits: HabitWithProgress[]) {
  return render(
    <SyncProvider>
      <DashboardWrapper habits={habits} todayLabel="今日" user={mockUser} />
    </SyncProvider>
  )
}

// 解決タイミングを制御するための deferred promise ヘルパー
function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

describe('DashboardWrapper の挙動固定', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    renderedProgressSnapshots.length = 0
    lastResetRollback = undefined
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('チェックイン追加', () => {
    it('クリックで楽観的に currentProgress が +1 され、Server Action 失敗時にロールバックされる', async () => {
      const deferred = createDeferred<{ error: { message: string; name: 'DatabaseError' }; ok: false }>()
      vi.mocked(addCheckinAction).mockReturnValue(deferred.promise)

      renderDashboard([{ ...baseHabit }])

      expect(screen.getByTestId('progress-habit-1').textContent).toBe('1')

      act(() => {
        fireEvent.click(screen.getByText('add-habit-1'))
      })

      // 楽観的更新は Server Action の解決を待たず同期的に反映される
      expect(screen.getByTestId('progress-habit-1').textContent).toBe('2')

      // Server Action が失敗レスポンスを返す
      await act(async () => {
        deferred.resolve({ error: { message: '失敗しました', name: 'DatabaseError' }, ok: false })
        await Promise.resolve()
        await Promise.resolve()
      })

      // ロールバックされ元の値に戻る
      expect(screen.getByTestId('progress-habit-1').textContent).toBe('1')
      expect(appToast.error).toHaveBeenCalled()
    })
  })

  describe('上限・下限ガード', () => {
    it('currentProgress が 0 のとき削除操作をしても値が変化しない', () => {
      vi.mocked(removeCheckinAction).mockResolvedValue({
        data: { currentCount: 0, deleted: false },
        ok: true,
      })

      renderDashboard([{ ...baseHabit, currentProgress: 0 }])

      act(() => {
        fireEvent.click(screen.getByText('remove-habit-1'))
      })

      expect(screen.getByTestId('progress-habit-1').textContent).toBe('0')
      expect(removeCheckinAction).not.toHaveBeenCalled()
    })

    it('currentProgress が frequency と等しいとき追加操作をしても値が変化しない', () => {
      vi.mocked(addCheckinAction).mockResolvedValue({
        data: { created: true, currentCount: 4 },
        ok: true,
      })

      renderDashboard([{ ...baseHabit, currentProgress: 4, frequency: 4 }])

      act(() => {
        fireEvent.click(screen.getByText('add-habit-1'))
      })

      expect(screen.getByTestId('progress-habit-1').textContent).toBe('4')
      expect(addCheckinAction).not.toHaveBeenCalled()
    })
  })

  describe('連打時のフリッカー防止', () => {
    it('2回連続クリックで、中間タスク完了時に楽観値が巻き戻らず最終的に正しい値へ収束する', async () => {
      const deferred1 = createDeferred<{ data: { created: boolean; currentCount: number }; ok: true }>()
      const deferred2 = createDeferred<{ data: { created: boolean; currentCount: number }; ok: true }>()
      vi.mocked(addCheckinAction).mockReturnValueOnce(deferred1.promise).mockReturnValueOnce(deferred2.promise)

      renderDashboard([{ ...baseHabit, currentProgress: 0, frequency: 4 }])

      // 1回目クリック: 楽観的に 0 -> 1
      act(() => {
        fireEvent.click(screen.getByText('add-habit-1'))
      })
      expect(screen.getByTestId('progress-habit-1').textContent).toBe('1')

      // 2回目クリック: 楽観的に 1 -> 2（同一 habitId はキューで直列化されるため、
      // 2番目のタスクはまだ Server Action を呼び出していない可能性があるが、
      // 楽観的更新自体は queueOptimisticCheckin 内で同期的に行われる）
      act(() => {
        fireEvent.click(screen.getByText('add-habit-1'))
      })
      expect(screen.getByTestId('progress-habit-1').textContent).toBe('2')

      const valuesBeforeResolve = [...renderedProgressSnapshots].map((snap) => snap[0])

      // 1回目のタスクを先に解決（中間タスク: サーバー値 currentCount=1 は無視されるべき）
      await act(async () => {
        deferred1.resolve({ data: { created: true, currentCount: 1 }, ok: true })
        await Promise.resolve()
        await Promise.resolve()
      })

      // フリッカーが起きていれば、ここで一時的に 1 に巻き戻る
      expect(screen.getByTestId('progress-habit-1').textContent).toBe('2')

      // 2回目（最後）のタスクを解決: サーバー値で確定してよい
      await act(async () => {
        deferred2.resolve({ data: { created: true, currentCount: 2 }, ok: true })
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(screen.getByTestId('progress-habit-1').textContent).toBe('2')

      // 記録した表示値の時系列で、途中に下降がないことを確認（巻き戻りが起きていないこと）
      const allValues = [
        ...valuesBeforeResolve,
        ...renderedProgressSnapshots.map((snap) => snap[0]).slice(valuesBeforeResolve.length),
      ]
      for (let i = 1; i < allValues.length; i++) {
        expect(allValues[i]).toBeGreaterThanOrEqual(allValues[i - 1])
      }
    })
  })

  describe('リセット（楽観的更新のみ、DashboardWrapper が公開する契約の範囲）', () => {
    it('リセットで進捗と完了率が 0 になり、達成済みの場合 streak が 1 減る。返り値のロールバックで復元できる', () => {
      renderDashboard([{ ...baseHabit, currentProgress: 4, frequency: 4, streak: 5 }])

      expect(screen.getByTestId('progress-habit-1').textContent).toBe('4')
      expect(screen.getByTestId('streak-habit-1').textContent).toBe('5')

      act(() => {
        fireEvent.click(screen.getByText('reset-habit-1'))
      })

      expect(screen.getByTestId('progress-habit-1').textContent).toBe('0')
      expect(screen.getByTestId('streak-habit-1').textContent).toBe('4')

      // DashboardWrapper 自体はサーバー呼び出しやロールバック実行を行わない。
      // 呼び出し元（実際には HabitSimpleView/HabitListView）が返り値の rollback を実行する契約になっている。
      expect(lastResetRollback).toBeDefined()

      act(() => {
        lastResetRollback?.()
      })

      expect(screen.getByTestId('progress-habit-1').textContent).toBe('4')
      expect(screen.getByTestId('streak-habit-1').textContent).toBe('5')
    })
  })

  describe('スキップ / スキップ解除', () => {
    it('スキップ成功時に appToast.success が呼ばれる', async () => {
      vi.mocked(addSkipAction).mockResolvedValue({ data: { skipped: true }, ok: true })

      renderDashboard([{ ...baseHabit }])

      await act(async () => {
        fireEvent.click(screen.getByText('skip-habit-1'))
        await Promise.resolve()
      })

      expect(addSkipAction).toHaveBeenCalledWith('habit-1', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
      expect(appToast.success).toHaveBeenCalledWith('今日をスキップしました（ストリーク維持）')
    })

    it('スキップ失敗時に appToast.error が呼ばれる', async () => {
      vi.mocked(addSkipAction).mockResolvedValue({
        error: { message: '失敗', name: 'DatabaseError' },
        ok: false,
      })

      renderDashboard([{ ...baseHabit }])

      await act(async () => {
        fireEvent.click(screen.getByText('skip-habit-1'))
        await Promise.resolve()
      })

      expect(appToast.error).toHaveBeenCalledWith('スキップの設定に失敗しました')
    })

    it('スキップ解除成功時に appToast.success が呼ばれる', async () => {
      vi.mocked(removeSkipAction).mockResolvedValue({ data: undefined, ok: true })

      renderDashboard([{ ...baseHabit }])

      await act(async () => {
        fireEvent.click(screen.getByText('unskip-habit-1'))
        await Promise.resolve()
      })

      expect(appToast.success).toHaveBeenCalledWith('スキップを解除しました')
    })

    it('スキップ解除失敗時に appToast.error が呼ばれる', async () => {
      vi.mocked(removeSkipAction).mockResolvedValue({
        error: { message: '失敗', name: 'DatabaseError' },
        ok: false,
      })

      renderDashboard([{ ...baseHabit }])

      await act(async () => {
        fireEvent.click(screen.getByText('unskip-habit-1'))
        await Promise.resolve()
      })

      expect(appToast.error).toHaveBeenCalledWith('スキップの解除に失敗しました')
    })
  })
})

// useOfflineCheckin は online 固定のモックであることの確認（テストの前提を明示化）
describe('前提: useOfflineCheckin はオンライン固定でモックされている', () => {
  it('isOnline が true を返す', () => {
    expect(useOfflineCheckin().isOnline).toBe(true)
  })
})
