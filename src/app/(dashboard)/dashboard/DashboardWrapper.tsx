'use client'

import { createId } from '@paralleldrive/cuid2'
import { Result } from '@praha/byethrow'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { toggleCheckinAction } from '@/app/actions/habits/checkin'
import { createHabit } from '@/app/actions/habits/create'
import type { IconName } from '@/components/Icon'
import { DesktopDashboard } from '@/components/streak/DesktopDashboard'
import { StreakDashboard } from '@/components/streak/StreakDashboard'
import { DEFAULT_HABIT_COLOR, DEFAULT_HABIT_FREQUENCY, DEFAULT_HABIT_PERIOD } from '@/constants/habit'
import { formatSerializableError } from '@/lib/errors/serializable'
import type { HabitWithProgress } from '@/types/habit'

interface Checkin {
  id: string
  habitId: string
  date: Date
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

  useEffect(() => {
    setOptimisticHabits(habits)
  }, [habits])

  const handleAddHabit = async (name: string, icon: IconName) => {
    const optimisticId = `optimistic-${createId()}`
    const now = new Date()
    const optimisticHabit: HabitWithProgress = {
      id: optimisticId,
      userId: user.id,
      name,
      icon,
      color: DEFAULT_HABIT_COLOR,
      period: DEFAULT_HABIT_PERIOD,
      frequency: DEFAULT_HABIT_FREQUENCY,
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

    const result = await createHabit(formData)

    if (Result.isSuccess(result)) {
      router.refresh()
      return
    }

    setOptimisticHabits((current) => current.filter((habit) => habit.id !== optimisticId))
    console.error('習慣の作成に失敗しました:', result.error)
    toast.error('習慣の作成に失敗しました', {
      description: formatSerializableError(result.error),
    })
  }

  const handleToggleCheckin = async (habitId: string) => {
    const result = await toggleCheckinAction(habitId)

    if (Result.isSuccess(result)) {
      router.refresh()
    } else {
      console.error('チェックインの切り替えに失敗しました:', result.error)
      toast.error('チェックインの切り替えに失敗しました', {
        description: result.error.message,
      })
    }
  }

  return (
    <>
      {/* スマホ版: STREAK風フルスクリーンUI */}
      <div className="md:hidden">
        <StreakDashboard
          habits={optimisticHabits}
          onAddHabit={handleAddHabit}
          onToggleCheckin={handleToggleCheckin}
          todayCheckins={todayCheckins}
          user={user}
        />
      </div>

      {/* PC版: shadcn/ui Cardレイアウト */}
      <div className="hidden md:block">
        <DesktopDashboard
          habits={optimisticHabits}
          onAddHabit={handleAddHabit}
          onToggleCheckin={handleToggleCheckin}
          todayCheckins={todayCheckins}
          user={user}
        />
      </div>
    </>
  )
}
