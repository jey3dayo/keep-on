'use client'

import { createId } from '@paralleldrive/cuid2'
import { Result } from '@praha/byethrow'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toggleCheckinAction } from '@/app/actions/habits/checkin'
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

interface Checkin {
  id: string
  habitId: string
  date: string
  createdAt: Date
}

interface User {
  id: string
  clerkId: string
  email: string
  createdAt: Date
  updatedAt: Date
}

interface DashboardWrapperProps {
  habits: HabitWithProgress[]
  todayCheckins: Checkin[]
  user: User
  initialView?: 'dashboard' | 'simple'
  hasTimeZoneCookie?: boolean
}

export function DashboardWrapper({
  habits,
  todayCheckins,
  user,
  initialView,
  hasTimeZoneCookie = true,
}: DashboardWrapperProps) {
  const router = useRouter()
  const [isTimeZoneReady, setIsTimeZoneReady] = useState(hasTimeZoneCookie)
  const [optimisticHabits, setOptimisticHabits] = useState(habits)
  const [, setOptimisticCheckins] = useState(todayCheckins)
  const [pendingCheckins, setPendingCheckins] = useState<Set<string>>(new Set())
  const hasRefreshedForTimeZone = useRef(false)

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

  const handleCompletedCheckin = async (habitId: string, dateKey: string) => {
    addPendingCheckin(habitId)

    try {
      const result = await toggleCheckinAction(habitId, dateKey)

      if (Result.isSuccess(result)) {
        router.refresh()
        return
      }

      appToast.error('チェックインの切り替えに失敗しました', result.error)
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
    setOptimisticCheckins(todayCheckins)
  }, [todayCheckins])

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

    if (Result.isSuccess(result)) {
      router.refresh()
      return
    }

    setOptimisticHabits((current) => current.filter((habit) => habit.id !== optimisticId))
    appToast.error('習慣の作成に失敗しました', result.error)
  }

  const handleToggleCheckin = async (habitId: string) => {
    if (pendingCheckins.has(habitId)) {
      return
    }

    const targetHabit = optimisticHabits.find((habit) => habit.id === habitId)
    if (!targetHabit) {
      return
    }

    const isCompleted = targetHabit.currentProgress >= targetHabit.frequency
    const now = new Date()
    const dateKey = formatDateKey(now)

    if (isCompleted) {
      await handleCompletedCheckin(habitId, dateKey)
      return
    }

    const addedCheckin: Checkin = {
      id: `optimistic-${createId()}`,
      habitId,
      date: dateKey,
      createdAt: now,
    }

    setOptimisticCheckins((current) => [...current, addedCheckin])
    updateHabitProgress(habitId, 1)
    addPendingCheckin(habitId)

    let shouldRollback = true

    try {
      const result = await toggleCheckinAction(habitId, dateKey)

      if (Result.isSuccess(result)) {
        shouldRollback = false
        router.refresh()
        return
      }

      appToast.error('チェックインの切り替えに失敗しました', result.error)
    } catch (error) {
      appToast.error('チェックインの切り替えに失敗しました', error)
    } finally {
      if (shouldRollback) {
        setOptimisticCheckins((current) => current.filter((checkin) => checkin.id !== addedCheckin.id))
        updateHabitProgress(habitId, -1)
      }
      clearPendingCheckin(habitId)
    }
  }

  const activeHabits = optimisticHabits.filter((habit) => !habit.archived)

  if (!isTimeZoneReady) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground text-sm">読み込み中...</div>
  }

  return (
    <>
      {/* スマホ版: STREAK風フルスクリーンUI */}
      <div className="md:hidden">
        <StreakDashboard
          habits={activeHabits}
          initialView={initialView}
          onAddHabit={handleAddHabit}
          onToggleCheckin={handleToggleCheckin}
        />
      </div>

      {/* PC版: shadcn/ui Cardレイアウト */}
      <div className="hidden md:block">
        <DesktopDashboard
          habits={activeHabits}
          onAddHabit={handleAddHabit}
          onToggleCheckin={handleToggleCheckin}
          user={user}
        />
      </div>
    </>
  )
}
