import { subDays } from 'date-fns'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/basics/Button'
import { Icon, type IconName } from '@/components/basics/Icon'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { SIGN_IN_PATH } from '@/constants/auth'
import { PERIOD_DISPLAY_NAME, PERIODS, type Period } from '@/constants/habit'
import { createRequestMeta, logInfo, logSpan } from '@/lib/logging'
import { getCheckinCountsByDateRange, getCheckinsByUserAndDate, getTotalCheckinsByUserId } from '@/lib/queries/checkin'
import { getHabitsWithProgress } from '@/lib/queries/habit'
import { getServerDateKey } from '@/lib/server/date'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import { syncUser } from '@/lib/user'
import { formatDateKey, parseDateKey } from '@/lib/utils/date'

export const metadata: Metadata = {
  title: 'アナリティクス - KeepOn',
  description:
    '習慣の達成率、トレンド、統計情報を可視化。長期的なパフォーマンス分析で、より良い習慣形成のためのインサイトを得られます。',
  openGraph: {
    title: 'アナリティクス - KeepOn',
    description: '習慣のトレンドと統計を分析・可視化',
    type: 'website',
  },
}

const periodStyles: Record<Period, { accent: string; bar: string }> = {
  daily: { accent: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500 dark:bg-emerald-400' },
  weekly: { accent: 'text-sky-600 dark:text-sky-400', bar: 'bg-sky-500 dark:bg-sky-400' },
  monthly: { accent: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500 dark:bg-amber-400' },
}

export default async function AnalyticsPage() {
  const timeoutMs = getRequestTimeoutMs()
  const requestMeta = createRequestMeta('/analytics')

  logInfo('request.analytics:start', requestMeta)

  const user = await logSpan('analytics.syncUser', () => syncUser(), requestMeta, { timeoutMs })

  if (!user) {
    logInfo('analytics.syncUser:missing', requestMeta)
    redirect(SIGN_IN_PATH)
  }

  const dateKey = await getServerDateKey()
  const baseDate = parseDateKey(dateKey)
  const startDateKey = formatDateKey(subDays(baseDate, 6))
  const endDateKey = formatDateKey(baseDate)
  const dayFormatter = new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric' })
  const numberFormatter = new Intl.NumberFormat('ja-JP')
  const averageFormatter = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

  // 同時リクエストの詰まりを避けるため順次実行
  const habits = await logSpan(
    'analytics.habits',
    () => getHabitsWithProgress(user.id, user.clerkId, dateKey),
    requestMeta,
    { timeoutMs }
  )
  const todayCheckins = await logSpan(
    'analytics.checkins.today',
    () => getCheckinsByUserAndDate(user.id, dateKey),
    requestMeta,
    { timeoutMs }
  )
  const totalCheckins = await logSpan(
    'analytics.checkins.total',
    () => getTotalCheckinsByUserId(user.id),
    requestMeta,
    { timeoutMs }
  )
  const checkinsByDate = await logSpan(
    'analytics.checkins.range',
    () => getCheckinCountsByDateRange(user.id, startDateKey, endDateKey),
    requestMeta,
    { timeoutMs }
  )

  logInfo('request.analytics:end', {
    ...requestMeta,
    habits: habits.length,
    todayCheckins: todayCheckins.length,
    totalCheckins,
  })

  const totalHabits = habits.length
  const completedHabits = habits.filter((habit) => habit.currentProgress >= habit.frequency).length
  const completionRate = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0
  const totalStreak = habits.reduce((sum, habit) => sum + habit.streak, 0)

  const periodBreakdown = PERIODS.map((period) => {
    const periodHabits = habits.filter((habit) => habit.period === period)
    const completed = periodHabits.filter((habit) => habit.currentProgress >= habit.frequency).length
    const rate = periodHabits.length > 0 ? Math.round((completed / periodHabits.length) * 100) : 0

    return {
      period,
      total: periodHabits.length,
      completed,
      rate,
    }
  })

  const activityDays = Array.from({ length: 7 }, (_, index) => subDays(baseDate, 6 - index))
  const activityMap = new Map(checkinsByDate.map((entry) => [entry.date, entry.count]))
  const activityData = activityDays.map((day) => {
    const key = formatDateKey(day)
    return {
      key,
      label: dayFormatter.format(day),
      count: activityMap.get(key) ?? 0,
    }
  })
  const activityMax = Math.max(1, ...activityData.map((entry) => entry.count))
  const activityTotal = activityData.reduce((sum, entry) => sum + entry.count, 0)
  const activityAverage = Math.round((activityTotal / activityData.length) * 10) / 10
  const activityAverageLabel = averageFormatter.format(activityAverage)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-balance font-bold text-3xl text-foreground">アナリティクス</h1>
        <p className="text-muted-foreground">習慣の達成状況とトレンドを確認できます。</p>
      </header>

      {totalHabits === 0 ? (
        <EmptyState />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              accent="text-accent"
              icon="check"
              label="今日の達成数"
              note="チェックイン数"
              value={numberFormatter.format(todayCheckins.length)}
            />
            <StatCard
              accent="text-emerald-600 dark:text-emerald-400"
              icon="target"
              label="達成率"
              note={`${numberFormatter.format(completedHabits)} / ${numberFormatter.format(totalHabits)} 完了`}
              progress={completionRate}
              value={`${numberFormatter.format(completionRate)}%`}
            />
            <StatCard
              accent="text-orange-500 dark:text-orange-400"
              icon="flame"
              label="総ストリーク"
              note="連続達成の合計"
              value={numberFormatter.format(totalStreak)}
            />
            <StatCard
              accent="text-sky-600 dark:text-sky-400"
              icon="circle-check"
              label="総チェックイン"
              note="これまでの記録"
              value={numberFormatter.format(totalCheckins)}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <Card>
              <CardHeader>
                <h2 className="text-balance font-semibold leading-none tracking-tight">直近7日間のアクティビティ</h2>
                <CardDescription>
                  合計 {numberFormatter.format(activityTotal)} 回・平均 {activityAverageLabel} 回/日
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div aria-hidden="true" className="grid grid-cols-7 gap-3">
                  {activityData.map((entry) => {
                    const ratio = entry.count === 0 ? 0 : Math.max(0.08, entry.count / activityMax)
                    return (
                      <div className="flex flex-col items-center gap-2" key={entry.key}>
                        <div className="flex h-28 w-full items-end">
                          <div className="flex h-full w-full items-end rounded-full bg-muted/70 p-1">
                            <div
                              className="h-full w-full origin-bottom rounded-full bg-primary transition-transform"
                              style={{ transform: `scaleY(${ratio})` }}
                            />
                          </div>
                        </div>
                        <span className="text-muted-foreground text-xs">{entry.label}</span>
                        <span className="font-semibold text-foreground text-xs">
                          {numberFormatter.format(entry.count)}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <ul className="sr-only">
                  {activityData.map((entry) => (
                    <li key={`${entry.key}-summary`}>
                      {entry.label} のチェックイン数: {numberFormatter.format(entry.count)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-balance font-semibold leading-none tracking-tight">期間別達成率</h2>
                <CardDescription>現在の期間における完了状況</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {periodBreakdown.map((entry) => (
                  <div className="space-y-2" key={entry.period}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{PERIOD_DISPLAY_NAME[entry.period]}</span>
                      <span className="text-muted-foreground">
                        {numberFormatter.format(entry.completed)}/{numberFormatter.format(entry.total)} 完了
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className={`h-full ${periodStyles[entry.period].bar}`} style={{ width: `${entry.rate}%` }} />
                    </div>
                    <p className={`text-xs ${periodStyles[entry.period].accent}`}>
                      {numberFormatter.format(entry.rate)}% 達成
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  note,
  icon,
  accent,
  progress,
}: {
  label: string
  value: string | number
  note: string
  icon: IconName
  accent: string
  progress?: number
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="font-bold text-2xl text-foreground">{value}</p>
          <p className="text-muted-foreground text-xs">{note}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Icon aria-hidden="true" className={`h-5 w-5 ${accent}`} name={icon} />
        </div>
      </div>
      {typeof progress === 'number' && (
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </Card>
  )
}

function EmptyState() {
  return (
    <Card className="flex flex-col items-center justify-center gap-4 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Icon aria-hidden="true" className="h-6 w-6 text-muted-foreground" name="sparkles" />
      </div>
      <div className="space-y-2">
        <h2 className="text-balance font-semibold text-foreground text-lg">まだ習慣がありません</h2>
        <p className="text-muted-foreground text-sm">
          最初の習慣を作成すると、達成状況やトレンドがここに表示されます。
        </p>
      </div>
      <Button asChild size="lg" variant="default">
        <Link href="/habits/new">習慣を作成</Link>
      </Button>
    </Card>
  )
}
