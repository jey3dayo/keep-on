import type { InferSelectModel } from 'drizzle-orm'
import { Icon, normalizeIconName } from '@/components/Icon'
import { getHabitsByUserId } from '@/lib/queries/habit'
import { getCurrentUserId } from '@/lib/user'

type Habit = InferSelectModel<typeof import('@/db/schema').habits>

export async function HabitListServer() {
  const userId = await getCurrentUserId()

  if (!userId) {
    return <p className="text-center text-muted-foreground">ログインしてください。</p>
  }

  const habits = await getHabitsByUserId(userId)

  if (habits.length === 0) {
    return <p className="text-center text-muted-foreground">まだ習慣がありません。最初の習慣を作成しましょう！</p>
  }

  return (
    <div className="grid gap-3">
      {habits.map((habit: Habit) => (
        <div
          className="flex items-center gap-4 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-accent"
          key={habit.id}
        >
          <Icon className="text-foreground" name={normalizeIconName(habit.icon)} size={24} />
          <div className="flex-1 space-y-1">
            <h3 className="font-medium text-card-foreground">{habit.name}</h3>
            <p className="text-muted-foreground text-sm">
              作成日: {new Date(habit.createdAt).toLocaleDateString('ja-JP')}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
