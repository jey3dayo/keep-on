'use client'

import { createId } from '@paralleldrive/cuid2'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { addCheckinAction } from '@/app/actions/habits/checkin'
import { createHabit } from '@/app/actions/habits/create'
import type { IconName } from '@/components/basics/Icon'
import { DesktopDashboard } from '@/components/streak/DesktopDashboard'
import { StreakDashboard } from '@/components/streak/StreakDashboard'
import {
  COMPLETION_THRESHOLD,
  DEFAULT_HABIT_COLOR,
  DEFAULT_HABIT_FREQUENCY,
  DEFAULT_HABIT_PERIOD,
  type Period,
} from '@/constants/habit'
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
  hasTimeZoneCookie?: boolean
}

export function DashboardWrapper({
  habits,
  todayLabel,
  user,
  initialView,
  hasTimeZoneCookie = true,
}: DashboardWrapperProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [isTimeZoneReady, setIsTimeZoneReady] = useState(hasTimeZoneCookie)
  const [optimisticHabits, setOptimisticHabits] = useState(habits)
  const [pendingCheckins, setPendingCheckins] = useState<Set<string>>(new Set())
  const inFlightCheckinsRef = useRef<Set<string>>(new Set())
  const activeRequestCountRef = useRef(0)
  const hasRefreshedForTimeZone = useRef(false)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const MAX_CONCURRENT_CHECKINS = 2

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
              archivedAt: habit.archivedAt ?? new Date(),
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
      startTransition(() => {
        router.refresh()
      })
    }, 300)
  }

  const updateHabitProgress = (habitId: string, delta: number) => {
    setOptimisticHabits((current) =>
      current.map((habit) => {
        if (habit.id !== habitId) {
          return habit
        }
        const nextProgress = Math.max(0, habit.currentProgress + delta)
        const completionRate = Math.min(
          COMPLETION_THRESHOLD,
          Math.round((nextProgress / habit.frequency) * COMPLETION_THRESHOLD)
        )
        return {
          ...habit,
          currentProgress: nextProgress,
          completionRate,
        }
      })
    )
  }

  const addPendingCheckin = (habitId: string) => {
    setPendingCheckins((current) => new Set(current).add(habitId))
  }

  const clearPendingCheckin = (habitId: string) => {
    setPendingCheckins((current) => {
      const next = new Set(current)
      next.delete(habitId)
      return next
    })
  }

  const markCheckinInFlight = (habitId: string) => {
    const current = inFlightCheckinsRef.current
    if (current.has(habitId)) {
      return false
    }
    current.add(habitId)
    return true
  }

  const clearCheckinInFlight = (habitId: string) => {
    inFlightCheckinsRef.current.delete(habitId)
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
  const handleCompletedCheckin = async (habitId: string, dateKey: string) => {
    addPendingCheckin(habitId)

    try {
      const { ok, result, error } = await runAddCheckin(habitId, dateKey)

      if (ok) {
        scheduleRefresh()
        return
      }

      if (result) {
        appToast.error('チェックインの切り替えに失敗しました', result.error)
        return
      }
      appToast.error('チェックインの切り替えに失敗しました', error)
    } catch (error) {
      appToast.error('チェックインの切り替えに失敗しました', error)
    } finally {
      clearPendingCheckin(habitId)
    }
  }

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!timeZone) {
      setIsTimeZoneReady(true)
      return
    }

    const existingTimeZone = getClientCookie('ko_tz') ?? ''
    if (existingTimeZone === timeZone) {
      setIsTimeZoneReady(true)
      return
    }

    if (hasRefreshedForTimeZone.current) {
      setIsTimeZoneReady(true)
      return
    }

    hasRefreshedForTimeZone.current = true
    setIsTimeZoneReady(false)
    setClientCookie('ko_tz', timeZone, { maxAge: 31_536_000, path: '/', sameSite: 'lax' })
    router.refresh()
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
    const now = new Date()
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
      router.refresh()
      return
    }

    setOptimisticHabits((current) => current.filter((habit) => habit.id !== optimisticId))
    appToast.error('習慣の作成に失敗しました', result.error)
  }

  const processIncompleteCheckin = async (habitId: string, dateKey: string) => {
    updateHabitProgress(habitId, 1)
    addPendingCheckin(habitId)

    let shouldRollback = true

    try {
      const { ok, result, error } = await runAddCheckin(habitId, dateKey)

      if (ok) {
        shouldRollback = false
        scheduleRefresh()
        return
      }

      if (result) {
        appToast.error('チェックインの切り替えに失敗しました', result.error)
        return
      }
      appToast.error('チェックインの切り替えに失敗しました', error)
    } catch (error) {
      appToast.error('チェックインの切り替えに失敗しました', error)
    } finally {
      if (shouldRollback) {
        updateHabitProgress(habitId, -1)
      }
      clearPendingCheckin(habitId)
    }
  }

  const handleToggleCheckin = async (habitId: string) => {
    if (pendingCheckins.has(habitId)) {
      return
    }
    const targetHabit = optimisticHabits.find((habit) => habit.id === habitId)
    if (!targetHabit) {
      return
    }
    if (!markCheckinInFlight(habitId)) {
      return
    }

    // グローバル同時リクエスト制限
    if (activeRequestCountRef.current >= MAX_CONCURRENT_CHECKINS) {
      clearCheckinInFlight(habitId)
      return
    }

    activeRequestCountRef.current++
    try {
      const isCompleted = targetHabit.currentProgress >= targetHabit.frequency
      const now = new Date()
      const dateKey = formatDateKey(now)

      if (isCompleted) {
        await handleCompletedCheckin(habitId, dateKey)
        return
      }

      await processIncompleteCheckin(habitId, dateKey)
    } finally {
      activeRequestCountRef.current--
      clearCheckinInFlight(habitId)
    }
  }

  const activeHabits = optimisticHabits.filter((habit) => !habit.archived)

  if (!isTimeZoneReady) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground text-sm">読み込み中…</div>
  }

  return (
    <>
      {/* スマホ版: STREAK風フルスクリーンUI */}
      <div className="flex-1 md:hidden">
        <StreakDashboard
          habits={activeHabits}
          initialView={initialView}
          onAddHabit={handleAddHabit}
          onArchiveOptimistic={archiveOptimistically}
          onDeleteOptimistic={deleteOptimistically}
          onResetOptimistic={resetOptimistically}
          onToggleCheckin={handleToggleCheckin}
          pendingCheckins={pendingCheckins}
          todayLabel={todayLabel}
        />
      </div>

      {/* PC版: shadcn/ui Cardレイアウト */}
      <div className="hidden flex-1 md:block">
        <DesktopDashboard
          habits={activeHabits}
          onAddHabit={handleAddHabit}
          onArchiveOptimistic={archiveOptimistically}
          onDeleteOptimistic={deleteOptimistically}
          onResetOptimistic={resetOptimistically}
          onToggleCheckin={handleToggleCheckin}
          pendingCheckins={pendingCheckins}
          todayLabel={todayLabel}
          user={user}
        />
      </div>
    </>
  )
}
