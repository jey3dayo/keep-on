'use client'

import { createId } from '@paralleldrive/cuid2'
import { Result } from '@praha/byethrow'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toggleCheckinAction } from '@/app/actions/habits/checkin'
import { createHabit } from '@/app/actions/habits/create'
import type { IconName } from '@/components/Icon'
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
}

export function DashboardWrapper({ habits, todayCheckins, user }: DashboardWrapperProps) {
  const router = useRouter()
  const [optimisticHabits, setOptimisticHabits] = useState(habits)
  const [optimisticCheckins, setOptimisticCheckins] = useState(todayCheckins)
  const [pendingCheckins, setPendingCheckins] = useState<Set<string>>(new Set())

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!timeZone) {
      return
    }

    const existingTimeZone = getClientCookie('ko_tz') ?? ''
    if (existingTimeZone === timeZone) {
      return
    }

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
    const normalizedFrequency = nextPeriod === 'daily' ? 1 : nextFrequency
    const optimisticId = `optimistic-${createId()}`
    const now = new Date()
    const optimisticHabit: HabitWithProgress = {
      id: optimisticId,
      userId: user.id,
      name,
      icon,
      color: nextColor,
      period: nextPeriod,
      frequency: normalizedFrequency,
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
    formData.append('frequency', String(normalizedFrequency))

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

    const isCompleted = optimisticCheckins.some((checkin) => checkin.habitId === habitId)
    const now = new Date()
    const dateKey = formatDateKey(now)
    const removedCheckin = isCompleted
      ? (optimisticCheckins.find((checkin) => checkin.habitId === habitId) ?? null)
      : null
    const addedCheckin = isCompleted
      ? null
      : {
          id: `optimistic-${createId()}`,
          habitId,
          date: dateKey,
          createdAt: now,
        }

    const updateHabitProgress = (current: HabitWithProgress[], delta: number) =>
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

    const applyOptimisticCheckins = (current: Checkin[]) => {
      if (isCompleted) {
        return current.filter((checkin) => checkin.habitId !== habitId)
      }
      return addedCheckin ? [...current, addedCheckin] : current
    }

    const rollbackOptimisticCheckins = (current: Checkin[]) => {
      if (isCompleted) {
        if (!removedCheckin) {
          return current
        }
        const alreadyExists = current.some((checkin) => checkin.id === removedCheckin.id)
        return alreadyExists ? current : [...current, removedCheckin]
      }
      if (!addedCheckin) {
        return current
      }
      return current.filter((checkin) => checkin.id !== addedCheckin.id)
    }

    setOptimisticCheckins((current) => applyOptimisticCheckins(current))
    setOptimisticHabits((current) => updateHabitProgress(current, isCompleted ? -1 : 1))
    setPendingCheckins((current) => new Set(current).add(habitId))

    try {
      const result = await toggleCheckinAction(habitId, dateKey)

      if (Result.isSuccess(result)) {
        router.refresh()
        return
      }

      setOptimisticCheckins((current) => rollbackOptimisticCheckins(current))
      setOptimisticHabits((current) => updateHabitProgress(current, isCompleted ? 1 : -1))
      appToast.error('チェックインの切り替えに失敗しました', result.error)
    } catch (error) {
      setOptimisticCheckins((current) => rollbackOptimisticCheckins(current))
      setOptimisticHabits((current) => updateHabitProgress(current, isCompleted ? 1 : -1))
      appToast.error('チェックインの切り替えに失敗しました', error)
    } finally {
      setPendingCheckins((current) => {
        const next = new Set(current)
        next.delete(habitId)
        return next
      })
    }
  }

  const activeHabits = optimisticHabits.filter((habit) => !habit.archived)
  const activeHabitIds = new Set(activeHabits.map((habit) => habit.id))
  const activeCheckins = optimisticCheckins.filter((checkin) => activeHabitIds.has(checkin.habitId))

  return (
    <>
      {/* スマホ版: STREAK風フルスクリーンUI */}
      <div className="md:hidden">
        <StreakDashboard
          habits={activeHabits}
          onAddHabit={handleAddHabit}
          onToggleCheckin={handleToggleCheckin}
          todayCheckins={activeCheckins}
          user={user}
        />
      </div>

      {/* PC版: shadcn/ui Cardレイアウト */}
      <div className="hidden md:block">
        <DesktopDashboard
          habits={activeHabits}
          onAddHabit={handleAddHabit}
          onToggleCheckin={handleToggleCheckin}
          todayCheckins={activeCheckins}
          user={user}
        />
      </div>
    </>
  )
}
