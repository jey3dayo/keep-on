import { HabitFormServer } from '@/components/habits/HabitFormServer'

export function DashboardClient() {
  return (
    <section>
      <h3 className="mb-4 font-bold text-slate-900 text-xl dark:text-white">新しい習慣を作成</h3>
      <div className="rounded-md border border-slate-300 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/50">
        <HabitFormServer />
      </div>
    </section>
  )
}
