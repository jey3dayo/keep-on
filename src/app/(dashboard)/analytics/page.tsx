import { subDays } from 'date-fns'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/basics/Button'
import { Icon, type IconName } from '@/components/basics/Icon'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { SIGN_IN_PATH } from '@/constants/auth'
import { PERIOD_DISPLAY_NAME, PERIODS, type Period } from '@/constants/habit'
import { createRequestMeta, logInfo, logSpan, logSpanOptional } from '@/lib/logging'
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

const periodStyles: Record<Period, { accent: string; bar: string; badge: string }> = {
  daily: {
    accent: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500 dark:bg-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200',
  },
  weekly: {
    accent: 'text-sky-600 dark:text-sky-400',
    bar: 'bg-sky-500 dark:bg-sky-400',
    badge: 'bg-sky-500/15 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200',
  },
  monthly: {
    accent: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500 dark:bg-amber-400',
    badge: 'bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200',
  },
}

export default async function AnalyticsPage() {
  const timeoutMs = getRequestTimeoutMs()
  const requestMeta = createRequestMeta('/analytics')

  logInfo('request.analytics:start', requestMeta)

  const user = await logSpanOptional('analytics.syncUser', () => syncUser(), requestMeta, { timeoutMs })

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

  // 待ち時間短縮のため集計クエリを並列実行
  const [habits, todayCheckins, totalCheckins, checkinsByDate] = await Promise.all([
    logSpan('analytics.habits', () => getHabitsWithProgress(user.id, user.clerkId, dateKey), requestMeta, {
      timeoutMs,
    }),
    logSpan('analytics.checkins.today', () => getCheckinsByUserAndDate(user.id, dateKey), requestMeta, { timeoutMs }),
    logSpan('analytics.checkins.total', () => getTotalCheckinsByUserId(user.id), requestMeta, { timeoutMs }),
    logSpan(
      'analytics.checkins.range',
      () => getCheckinCountsByDateRange(user.id, startDateKey, endDateKey),
      requestMeta,
      { timeoutMs }
    ),
  ])

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
  const rangeLabel =
    activityDays.length > 0
      ? `${dayFormatter.format(activityDays[0])}〜${dayFormatter.format(activityDays[activityDays.length - 1])}`
      : '-'
  const activityMax = Math.max(1, ...activityData.map((entry) => entry.count))
  const activityTotal = activityData.reduce((sum, entry) => sum + entry.count, 0)
  const activityAverage = Math.round((activityTotal / activityData.length) * 10) / 10
  const activityAverageLabel = averageFormatter.format(activityAverage)
  const activityActiveDays = activityData.filter((entry) => entry.count > 0).length
  const activityPeakFallback = { key: 'peak', label: '-', count: 0 }
  const activityPeak = activityData.reduce(
    (best, entry) => (entry.count > best.count ? entry : best),
    activityData[0] ?? activityPeakFallback
  )

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-balance font-bold text-3xl text-foreground">アナリティクス</h1>
          <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-muted-foreground text-xs">
            直近7日: {rangeLabel}
          </span>
        </div>
        <p className="text-muted-foreground">習慣の達成状況とトレンドを確認できます。</p>
        <div className="flex flex-wrap gap-2 text-muted-foreground text-xs">
          <span className="rounded-full border border-border/60 bg-card px-2.5 py-1">
            アクティブ日数 {numberFormatter.format(activityActiveDays)}/7
          </span>
          <span className="rounded-full border border-border/60 bg-card px-2.5 py-1">
            合計 {numberFormatter.format(activityTotal)} 回
          </span>
          <span className="rounded-full border border-border/60 bg-card px-2.5 py-1">
            最多 {activityPeak.label} {numberFormatter.format(activityPeak.count)} 回
          </span>
        </div>
      </header>

      {totalHabits === 0 ? (
        <EmptyState />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              accent="text-accent"
              accentBar="bg-accent"
              accentBg="bg-accent/20"
              icon="check"
              label="今日の達成数"
              note="チェックイン数"
              value={numberFormatter.format(todayCheckins.length)}
            />
            <StatCard
              accent="text-emerald-600 dark:text-emerald-400"
              accentBar="bg-emerald-500 dark:bg-emerald-400"
              accentBg="bg-emerald-500/15 dark:bg-emerald-400/15"
              icon="target"
              label="達成率"
              note={`${numberFormatter.format(completedHabits)} / ${numberFormatter.format(totalHabits)} 完了`}
              progress={completionRate}
              value={`${numberFormatter.format(completionRate)}%`}
            />
            <StatCard
              accent="text-orange-500 dark:text-orange-400"
              accentBar="bg-orange-500 dark:bg-orange-400"
              accentBg="bg-orange-500/15 dark:bg-orange-400/15"
              icon="flame"
              label="総ストリーク"
              note="連続達成の合計"
              value={numberFormatter.format(totalStreak)}
            />
            <StatCard
              accent="text-sky-600 dark:text-sky-400"
              accentBar="bg-sky-500 dark:bg-sky-400"
              accentBg="bg-sky-500/15 dark:bg-sky-400/15"
              icon="circle-check"
              label="総チェックイン"
              note="これまでの記録"
              value={numberFormatter.format(totalCheckins)}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <Card className="border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="pb-3">
                <h2 className="text-balance font-semibold leading-none tracking-tight">直近7日間のアクティビティ</h2>
                <CardDescription>
                  直近7日（{rangeLabel}）の合計 {numberFormatter.format(activityTotal)} 回・平均 {activityAverageLabel}{' '}
                  回/日
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div aria-hidden="true" className="grid grid-cols-7 gap-3">
                    {activityData.map((entry) => {
                      const ratio = entry.count === 0 ? 0 : Math.max(0.08, entry.count / activityMax)
                      return (
                        <div className="flex flex-col items-center gap-2" key={entry.key}>
                          <div className="flex h-28 w-full items-end">
                            <div className="flex h-full w-full items-end rounded-full bg-muted/70 p-1">
                              <div
                                className="h-full w-full origin-bottom rounded-full bg-primary transition-transform duration-300 motion-reduce:transition-none"
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
                </div>
                <div className="grid gap-4 border-border/60 border-t pt-4 sm:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">アクティブ日数</p>
                    <p className="font-semibold text-foreground text-sm">
                      {numberFormatter.format(activityActiveDays)}/7 日
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">最多の日</p>
                    <p className="font-semibold text-foreground text-sm">
                      {activityPeak.label}・{numberFormatter.format(activityPeak.count)} 回
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">平均</p>
                    <p className="font-semibold text-foreground text-sm">{activityAverageLabel} 回/日</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="pb-3">
                <h2 className="text-balance font-semibold leading-none tracking-tight">期間別達成率</h2>
                <CardDescription>現在の期間における完了状況</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {periodBreakdown.map((entry) => (
                  <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3" key={entry.period}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{PERIOD_DISPLAY_NAME[entry.period]}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${periodStyles[entry.period].badge}`}>
                        {numberFormatter.format(entry.rate)}%
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {numberFormatter.format(entry.completed)}/{numberFormatter.format(entry.total)} 完了
                    </p>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                      <div
                        className={`h-full ${periodStyles[entry.period].bar} transition-[width] duration-500 motion-reduce:transition-none`}
                        style={{ width: `${entry.rate}%` }}
                      />
                    </div>
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
  accentBar,
  accentBg,
  progress,
}: {
  label: string
  value: string | number
  note: string
  icon: IconName
  accent: string
  accentBar: string
  accentBg: string
  progress?: number
}) {
  return (
    <Card className="relative overflow-hidden border-border/60 bg-card/80 p-4 shadow-sm">
      <div aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${accentBar}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="font-bold text-2xl text-foreground">{value}</p>
          <p className="text-muted-foreground text-xs">{note}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${accentBg}`}>
          <Icon aria-hidden="true" className={`h-5 w-5 ${accent}`} name={icon} />
        </div>
      </div>
      {typeof progress === 'number' && (
        <div className="mt-4">
          <span className="sr-only">達成率 {progress}%</span>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
            <div
              className="h-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
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
