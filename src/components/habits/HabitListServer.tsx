import { prisma } from '@/lib/db'
import { getCurrentUserId } from '@/lib/user'

export async function HabitListServer() {
  const userId = await getCurrentUserId()

  if (!userId) {
    return <p className="text-center text-slate-600 dark:text-slate-400">ログインしてください。</p>
  }

  const habits = await prisma.habit.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  if (habits.length === 0) {
    return <p className="text-center text-slate-600 dark:text-slate-400">まだ習慣がありません。最初の習慣を作成しましょう！</p>
  }

  return (
    <div className="space-y-3">
      {habits.map((habit) => (
        <div
          className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white p-4 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800"
          key={habit.id}
        >
          {habit.emoji && <span className="text-2xl">{habit.emoji}</span>}
          <div className="flex-1">
            <h3 className="font-medium text-slate-900 dark:text-white">{habit.name}</h3>
            <p className="text-slate-600 text-sm dark:text-slate-400">
              作成日: {new Date(habit.createdAt).toLocaleDateString('ja-JP')}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
