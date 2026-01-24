import { HabitFormServer } from '@/components/habits/HabitFormServer'

export function DashboardClient() {
  return (
    <section className="space-y-4">
      <h2 className="font-bold text-foreground text-xl">新しい習慣を作成</h2>
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <HabitFormServer />
      </div>
    </section>
  )
}
