'use client'

import { useCallback, useState } from 'react'
import { HabitForm } from '@/components/habits/HabitForm'
import { HabitListClient } from '@/components/habits/HabitListClient'

export function DashboardClient() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleHabitCreated = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-4 font-bold text-white text-xl">新しい習慣を作成</h3>
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
          <HabitForm onSuccess={handleHabitCreated} />
        </div>
      </section>

      <section>
        <h3 className="mb-4 font-bold text-white text-xl">あなたの習慣</h3>
        <div key={refreshKey}>
          <HabitListClient />
        </div>
      </section>
    </div>
  )
}
