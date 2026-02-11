'use client'

import { createId } from '@paralleldrive/cuid2'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { addCheckinAction } from '@/app/actions/habits/checkin'
import { createHabit } from '@/app/actions/habits/create'
import { removeCheckinAction } from '@/app/actions/habits/remove-checkin'
import type { IconName } from '@/components/basics/Icon'
import { DesktopDashboard } from '@/components/streak/DesktopDashboard'
import { StreakDashboard } from '@/components/streak/StreakDashboard'
import { MAX_CONCURRENT_CHECKINS } from '@/constants/dashboard'
import {
  COMPLETION_THRESHOLD,
  DEFAULT_HABIT_COLOR,
  DEFAULT_HABIT_FREQUENCY,
  DEFAULT_HABIT_PERIOD,
  type Period,
} from '@/constants/habit'
import { useSyncContext } from '@/contexts/SyncContext'
import { useBeforeUnload } from '@/hooks/useBeforeUnload'
import { getClientCookie, setClientCookie } from '@/lib/utils/cookies'
import { formatDateKey } from '@/lib/utils/date'
import { appToast } from '@/lib/utils/toast'
import type { HabitWithProgress } from '@/types/habit'
import type { User } from '@/types/user'

interface DashboardWrapperProps {
  habits: HabitWithProgress[]
  todayLabel: string
  user: User
  initialView?: 'dashboard' | 'simple'
}

interface CheckinTask {
  habitId: string
  dateKey: string
  isRemove?: boolean
  rollback?: () => void
}

export function DashboardWrapper({ habits, todayLabel, user, initialView }: DashboardWrapperProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const { startSync, endSync, isSyncing } = useSyncContext()
  const [optimisticHabits, setOptimisticHabits] = useState(habits)
  const pendingCheckinsRef = useRef<Set<string>>(new Set())
  const pendingCountRef = useRef<Map<string, number>>(new Map())
  const activeRequestCountRef = useRef(0)
  const activeHabitsRef = useRef<Set<string>>(new Set())
  const checkinQueueRef = useRef<CheckinTask[]>([])
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isRefreshing = useRef(false)

  // ページ離脱警告（同期中のみ）
  useBeforeUnload(isSyncing)

  const runOptimisticUpdateForHabit = (
    habitId: string,
    updater: (current: HabitWithProgress[]) => HabitWithProgress[]
  ) => {
    let previousHabit: HabitWithProgress | null = null
    let previousIndex = -1
    setOptimisticHabits((current) => {
      previousIndex = current.findIndex((habit) => habit.id === habitId)
      previousHabit = previousIndex >= 0 ? current[previousIndex] : null
      return updater(current)
    })
    return () => {
      if (!previousHabit) {
        return
      }
      const rollbackHabit = previousHabit
      setOptimisticHabits((current) => {
        const existingIndex = current.findIndex((habit) => habit.id === habitId)
        if (existingIndex >= 0) {
          const next = [...current]
          next[existingIndex] = rollbackHabit
          return next
        }
        const next = [...current]
        const insertIndex = previousIndex >= 0 && previousIndex <= next.length ? previousIndex : next.length
        next.splice(insertIndex, 0, rollbackHabit)
        return next
      })
    }
  }

  const archiveOptimistically = (habitId: string) =>
    runOptimisticUpdateForHabit(habitId, (current) =>
      current.map((habit) =>
        habit.id === habitId
          ? {
              ...habit,
              archived: true,
              archivedAt: habit.archivedAt ?? new Date().toISOString(),
            }
          : habit
      )
    )

  const deleteOptimistically = (habitId: string) =>
    runOptimisticUpdateForHabit(habitId, (current) => current.filter((habit) => habit.id !== habitId))

  const resetOptimistically = (habitId: string) =>
    runOptimisticUpdateForHabit(habitId, (current) =>
      current.map((habit) => {
        if (habit.id !== habitId) {
          return habit
        }
        const wasCompleted = habit.currentProgress >= habit.frequency
        return {
          ...habit,
          currentProgress: 0,
          completionRate: 0,
          streak: wasCompleted ? Math.max(0, habit.streak - 1) : habit.streak,
        }
      })
    )

  const scheduleRefresh = () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
    refreshTimeoutRef.current = setTimeout(() => {
      // 既にリフレッシュ中の場合はスキップ
      if (isRefreshing.current) {
        return
      }
      // 保留中のチェックインがある場合はスキップ（clearPendingCheckin で再スケジュールされる）
      // useRef で最新の pending 状態を参照（クロージャの stale を回避）
      if (pendingCheckinsRef.current.size > 0) {
        return
      }
      isRefreshing.current = true
      startTransition(() => {
        router.refresh()
        // リフレッシュ完了後、少し待ってからフラグをリセット
        setTimeout(() => {
          isRefreshing.current = false
        }, 1000)
      })
    }, 500)
  }

  const scheduleLazyRefresh = () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
    // 5分後にバックグラウンドリフレッシュ（整合性確保のためのフォールバック）
    refreshTimeoutRef.current = setTimeout(() => {
      if (isRefreshing.current || pendingCheckinsRef.current.size > 0) {
        return
      }
      isRefreshing.current = true
      startTransition(() => {
        router.refresh()
        setTimeout(() => {
          isRefreshing.current = false
        }, 1000)
      })
    }, 300_000) // 5分
  }

  const calculateCompletionRate = (progress: number, frequency: number) =>
    Math.min(COMPLETION_THRESHOLD, Math.round((progress / frequency) * COMPLETION_THRESHOLD))

  const updateOptimisticHabitProgress = (habitId: string, getNextProgress: (habit: HabitWithProgress) => number) => {
    setOptimisticHabits((current) =>
      current.map((habit) => {
        if (habit.id !== habitId) {
          return habit
        }
        const nextProgress = getNextProgress(habit)
        const completionRate = calculateCompletionRate(nextProgress, habit.frequency)
        return {
          ...habit,
          currentProgress: nextProgress,
          completionRate,
        }
      })
    )
  }

  const finalizeCheckinProgress = (habitId: string, serverCount: number) => {
    updateOptimisticHabitProgress(habitId, () => serverCount)
  }

  const updateHabitProgress = (habitId: string, delta: number) => {
    updateOptimisticHabitProgress(habitId, (habit) => Math.max(0, habit.currentProgress + delta))
  }

  const addPendingCheckin = (habitId: string) => {
    // カウントを増やす
    const currentCount = pendingCountRef.current.get(habitId) ?? 0
    pendingCountRef.current.set(habitId, currentCount + 1)

    // 初回のみSetに追加
    if (currentCount === 0) {
      pendingCheckinsRef.current.add(habitId)
    }

    startSync(habitId)
  }

  const clearPendingCheckin = (habitId: string) => {
    // カウントを減らす
    const currentCount = pendingCountRef.current.get(habitId) ?? 0
    if (currentCount <= 1) {
      pendingCountRef.current.delete(habitId)
      pendingCheckinsRef.current.delete(habitId)

      // pendingセットが空になった場合、保留されていたリフレッシュを再スケジュール
      if (pendingCheckinsRef.current.size === 0 && refreshTimeoutRef.current) {
        scheduleRefresh()
      }
    } else {
      pendingCountRef.current.set(habitId, currentCount - 1)
    }

    endSync(habitId)
  }

  const runAddCheckin = async (habitId: string, dateKey: string) => {
    try {
      const result = await addCheckinAction(habitId, dateKey)
      if (result.ok) {
        return { ok: true as const, result }
      }
      return { ok: false as const, result }
    } catch (error) {
      return { ok: false as const, error }
    }
  }

  const runRemoveCheckin = async (habitId: string, dateKey: string) => {
    try {
      const result = await removeCheckinAction(habitId, dateKey)
      if (result.ok) {
        return { ok: true as const, result }
      }
      return { ok: false as const, result }
    } catch (error) {
      return { ok: false as const, error }
    }
  }

  const runCheckinTask = async (task: CheckinTask) => {
    let shouldRollback = Boolean(task.rollback)

    try {
      const action = task.isRemove ? runRemoveCheckin : runAddCheckin
      const { ok, result, error } = await action(task.habitId, task.dateKey)

      if (ok) {
        shouldRollback = false
        // サーバーの状態を即座に反映
        if ('currentCount' in result.data) {
          finalizeCheckinProgress(task.habitId, result.data.currentCount)
        }
        // 5分後にバックグラウンドリフレッシュ（整合性確保のためのフォールバック）
        scheduleLazyRefresh()
        return
      }

      if (result && !ok && 'error' in result) {
        appToast.error('チェックインの切り替えに失敗しました', result.error)
        return
      }
      appToast.error('チェックインの切り替えに失敗しました', error)
    } catch (error) {
      appToast.error('チェックインの切り替えに失敗しました', error)
    } finally {
      if (shouldRollback && task.rollback) {
        task.rollback()
      }
      clearPendingCheckin(task.habitId)
    }
  }

  const startCheckinTask = (task: CheckinTask) => {
    activeRequestCountRef.current += 1
    activeHabitsRef.current.add(task.habitId)

    runCheckinTask(task).finally(() => {
      activeRequestCountRef.current = Math.max(0, activeRequestCountRef.current - 1)
      activeHabitsRef.current.delete(task.habitId)
      drainCheckinQueue()
    })
  }

  const drainCheckinQueue = () => {
    while (activeRequestCountRef.current < MAX_CONCURRENT_CHECKINS && checkinQueueRef.current.length > 0) {
      // まだ実行中でないhabitIdのタスクを優先的に選択
      const nextIndex = checkinQueueRef.current.findIndex((task) => !activeHabitsRef.current.has(task.habitId))
      if (nextIndex === -1) {
        // すべてのキュー内タスクが実行中の習慣 → 待機
        break
      }
      const next = checkinQueueRef.current.splice(nextIndex, 1)[0]
      if (!next) {
        return
      }
      startCheckinTask(next)
    }
  }

  const enqueueCheckin = (task: CheckinTask) => {
    checkinQueueRef.current.push(task)
    drainCheckinQueue()
  }

  // タイムゾーンCookieをバックグラウンドで設定（ブロッキングなし）
  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!timeZone) {
      return
    }

    const existingTimeZone = getClientCookie('ko_tz') ?? ''
    if (existingTimeZone === timeZone) {
      return
    }

    // Cookieを設定してサーバーコンポーネントを再取得
    setClientCookie('ko_tz', timeZone, { maxAge: 31_536_000, path: '/', sameSite: 'lax' })
    // タイムゾーン反映のため一度だけrefresh（初回アクセス時のみ）
    startTransition(() => {
      router.refresh()
    })
  }, [router])

  useEffect(() => {
    setOptimisticHabits(habits)
  }, [habits])

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

  const handleAddHabit = async (
    name: string,
    icon: IconName,
    options?: { color?: string | null; period?: Period; frequency?: number }
  ) => {
    const nextPeriod = options?.period ?? DEFAULT_HABIT_PERIOD
    const nextColor = options?.color ?? DEFAULT_HABIT_COLOR
    const nextFrequency = options?.frequency ?? DEFAULT_HABIT_FREQUENCY
    const optimisticId = `optimistic-${createId()}`
    const now = new Date().toISOString()
    const optimisticHabit: HabitWithProgress = {
      id: optimisticId,
      userId: user.id,
      name,
      icon,
      color: nextColor,
      period: nextPeriod,
      frequency: nextFrequency,
      archived: false,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      currentProgress: 0,
      streak: 0,
      completionRate: 0,
    }

    setOptimisticHabits((current) => [optimisticHabit, ...current])

    const formData = new FormData()
    formData.append('name', name)
    formData.append('icon', icon)
    formData.append('color', nextColor)
    formData.append('period', nextPeriod)
    formData.append('frequency', String(nextFrequency))

    const result = await createHabit(formData)

    if (result.ok) {
      // サーバーから返されたIDで楽観的IDを置換
      setOptimisticHabits((current) =>
        current.map((habit) => (habit.id === optimisticId ? { ...habit, id: result.data.id } : habit))
      )
      // 5分後にバックグラウンドリフレッシュ（整合性確保のためのフォールバック）
      scheduleLazyRefresh()
      return
    }

    setOptimisticHabits((current) => current.filter((habit) => habit.id !== optimisticId))
    appToast.error('習慣の作成に失敗しました', result.error)
  }

  const handleAddCheckin = (habitId: string): Promise<void> => {
    const targetHabit = optimisticHabits.find((habit) => habit.id === habitId)
    if (!targetHabit || targetHabit.currentProgress >= targetHabit.frequency) {
      return Promise.resolve()
    }

    const now = new Date()
    const dateKey = formatDateKey(now)

    updateHabitProgress(habitId, 1)
    addPendingCheckin(habitId)
    enqueueCheckin({
      habitId,
      dateKey,
      isRemove: false,
      rollback: () => updateHabitProgress(habitId, -1),
    })

    return Promise.resolve()
  }

  const handleRemoveCheckin = (habitId: string): Promise<void> => {
    const targetHabit = optimisticHabits.find((habit) => habit.id === habitId)
    if (!targetHabit || targetHabit.currentProgress <= 0) {
      return Promise.resolve()
    }

    const now = new Date()
    const dateKey = formatDateKey(now)

    updateHabitProgress(habitId, -1)
    addPendingCheckin(habitId)
    enqueueCheckin({
      habitId,
      dateKey,
      isRemove: true,
      rollback: () => updateHabitProgress(habitId, 1),
    })

    return Promise.resolve()
  }

  const activeHabits = optimisticHabits.filter((habit) => !habit.archived)

  return (
    <>
      {/* スマホ版: STREAK風フルスクリーンUI */}
      <div className="flex-1 md:hidden">
        <StreakDashboard
          habits={activeHabits}
          initialView={initialView}
          onAddCheckin={handleAddCheckin}
          onAddHabit={handleAddHabit}
          onArchiveOptimistic={archiveOptimistically}
          onDeleteOptimistic={deleteOptimistically}
          onRemoveCheckin={handleRemoveCheckin}
          onResetOptimistic={resetOptimistically}
          todayLabel={todayLabel}
        />
      </div>

      {/* PC版: shadcn/ui Cardレイアウト */}
      <div className="hidden flex-1 md:block">
        <DesktopDashboard
          habits={activeHabits}
          onAddCheckin={handleAddCheckin}
          onAddHabit={handleAddHabit}
          onArchiveOptimistic={archiveOptimistically}
          onDeleteOptimistic={deleteOptimistically}
          onRemoveCheckin={handleRemoveCheckin}
          onResetOptimistic={resetOptimistically}
          todayLabel={todayLabel}
          user={user}
        />
      </div>
    </>
  )
}
