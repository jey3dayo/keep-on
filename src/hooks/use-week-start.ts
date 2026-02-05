'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_WEEK_START, type WeekStart } from '@/constants/habit'

interface UseWeekStart {
  weekStart: WeekStart
  setWeekStart: (weekStart: WeekStart) => void
  ready: boolean
}

const STORAGE_KEY = 'week-start'

/**
 * 週の開始日フック
 *
 * Note: このフックは後方互換性のために維持されています。
 * 新しいコードでは useUserSettings を使用することを推奨します。
 */
export function useWeekStart(): UseWeekStart {
  const [weekStart, setWeekStartState] = useState<WeekStart | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const next = stored && isValidWeekStart(stored) ? stored : DEFAULT_WEEK_START
    setWeekStartState(next)
  }, [])

  const setWeekStart = (newWeekStart: WeekStart) => {
    setWeekStartState(newWeekStart)
    localStorage.setItem(STORAGE_KEY, newWeekStart)
  }

  return { weekStart: weekStart ?? DEFAULT_WEEK_START, setWeekStart, ready: weekStart !== null }
}

function isValidWeekStart(value: string): value is WeekStart {
  return value === 'monday' || value === 'sunday'
}
