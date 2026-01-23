'use client'

import { useCallback, useEffect, useState } from 'react'

interface Habit {
  id: string
  name: string
  emoji: string | null
  createdAt: string
}

export function HabitListClient() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchHabits = useCallback(async () => {
    try {
      const response = await fetch('/api/habits')
      if (response.ok) {
        const data = await response.json()
        setHabits(data.habits)
      }
    } catch (error) {
      console.error('Failed to fetch habits:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHabits()
  }, [fetchHabits])

  if (isLoading) {
    return <p className="text-center text-slate-400">読み込み中...</p>
  }

  if (habits.length === 0) {
    return <p className="text-center text-slate-400">まだ習慣がありません。最初の習慣を作成しましょう！</p>
  }

  return (
    <div className="space-y-3">
      {habits.map((habit) => (
        <div
          className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-4 transition hover:bg-slate-800"
          key={habit.id}
        >
          {habit.emoji && <span className="text-2xl">{habit.emoji}</span>}
          <div className="flex-1">
            <h3 className="font-medium text-white">{habit.name}</h3>
            <p className="text-slate-400 text-sm">作成日: {new Date(habit.createdAt).toLocaleDateString('ja-JP')}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
