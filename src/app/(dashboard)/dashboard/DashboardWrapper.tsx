'use client'

import { Result } from '@praha/byethrow'
import { useRouter } from 'next/navigation'
import { toggleCheckinAction } from '@/app/actions/habits/checkin'
import { createHabit } from '@/app/actions/habits/create'
import type { IconName } from '@/components/Icon'
import { DesktopDashboard } from '@/components/streak/DesktopDashboard'
import { StreakDashboard } from '@/components/streak/StreakDashboard'

interface Habit {
  id: string
  name: string
  icon: string | null
  userId: string
  createdAt: Date
  updatedAt: Date
}

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
  habits: Habit[]
  todayCheckins: Checkin[]
  user: User
}

export function DashboardWrapper({ habits, todayCheckins, user }: DashboardWrapperProps) {
  const router = useRouter()

  const handleAddHabit = async (name: string, icon: IconName) => {
    const formData = new FormData()
    formData.append('name', name)
    formData.append('icon', icon)

    const result = await createHabit(formData)

    if (Result.isSuccess(result)) {
      router.refresh()
    } else {
      console.error('習慣の作成に失敗しました:', result.error)
    }
  }

  const handleToggleCheckin = async (habitId: string) => {
    const result = await toggleCheckinAction(habitId)

    if (Result.isSuccess(result)) {
      router.refresh()
    } else {
      console.error('チェックインの切り替えに失敗しました:', result.error)
    }
  }

  return (
    <>
      {/* スマホ版: STREAK風フルスクリーンUI */}
      <div className="md:hidden">
        <StreakDashboard
          habits={habits}
          onAddHabit={handleAddHabit}
          onToggleCheckin={handleToggleCheckin}
          todayCheckins={todayCheckins}
          user={user}
        />
      </div>

      {/* PC版: shadcn/ui Cardレイアウト */}
      <div className="hidden md:block">
        <DesktopDashboard
          habits={habits}
          onAddHabit={handleAddHabit}
          onToggleCheckin={handleToggleCheckin}
          todayCheckins={todayCheckins}
          user={user}
        />
      </div>
    </>
  )
}
