import { ChevronLeft, Flame, Pencil, Target, TrendingUp } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Button } from '@/components/basics/Button'
import { normalizeIconName } from '@/components/basics/Icon'
import { HabitCalendarHeatmap } from '@/components/habits/HabitCalendarHeatmap'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SIGN_IN_PATH } from '@/constants/auth'
import { DEFAULT_HABIT_COLOR, PERIOD_DISPLAY_NAME } from '@/constants/habit'
import { getColorById, getIconById } from '@/constants/habit-data'
import { createRequestMeta, logInfo, logSpan, logSpanOptional } from '@/lib/logging'
import { getHabitById } from '@/lib/queries/habit'
import { getHabitCalendarData } from '@/lib/queries/habit-calendar'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import { getCurrentUserId } from '@/lib/user'
import type { HabitIdPageProps } from '@/types/route'

export async function generateMetadata({ params: _params }: HabitIdPageProps): Promise<Metadata> {
  return { title: '習慣詳細 - KeepOn' }
}

export default async function HabitDetailPage({ params }: HabitIdPageProps) {
  const timeoutMs = getRequestTimeoutMs()
  const requestMeta = createRequestMeta('/habits/[id]')

  logInfo('request.habits.detail:start', requestMeta)

  const userId = await logSpanOptional('habits.detail.syncUser', () => getCurrentUserId(), requestMeta, {
    timeoutMs,
  })

  if (!userId) {
    redirect(SIGN_IN_PATH)
  }

  const { id } = await params
  const [habit, calendarData] = await Promise.all([
    logSpan('habits.detail.fetchHabit', () => getHabitById(id), requestMeta, { timeoutMs }),
    logSpan('habits.detail.fetchCalendar', () => getHabitCalendarData(id), requestMeta, { timeoutMs }),
  ])

  if (!habit) {
    notFound()
  }

  if (habit.userId !== userId) {
    redirect('/habits')
  }

  logInfo('request.habits.detail:end', requestMeta)

  const colorData = getColorById(habit.color ?? DEFAULT_HABIT_COLOR)
  const IconComponent = getIconById(normalizeIconName(habit.icon)).icon
  const checkinDates = Array.from(calendarData.checkinDates)
  const skipDates = Array.from(calendarData.skipDates)
  const totalCheckins = checkinDates.length
  const periodLabel = PERIOD_DISPLAY_NAME[habit.period]

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild size="sm" variant="ghost">
          <Link href="/habits">
            <ChevronLeft className="h-4 w-4" />
            戻る
          </Link>
        </Button>
        <div className="flex flex-1 items-center gap-3">
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: colorData.color }}
          >
            <IconComponent className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-bold text-2xl text-foreground">{habit.name}</h1>
            <p className="text-muted-foreground text-sm">
              {periodLabel} · {habit.frequency}回
            </p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/habits/${habit.id}/edit`}>
            <Pencil className="mr-1.5 h-4 w-4" />
            編集
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center gap-1 pt-4 pb-4">
            <Flame className="h-5 w-5 text-orange-500" />
            <span className="font-bold text-2xl" style={{ color: colorData.color }}>
              {totalCheckins}
            </span>
            <span className="text-center text-muted-foreground text-xs">総チェックイン</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 pt-4 pb-4">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <span className="font-bold text-2xl" style={{ color: colorData.color }}>
              {skipDates.length}
            </span>
            <span className="text-center text-muted-foreground text-xs">スキップ回数</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 pt-4 pb-4">
            <Target className="h-5 w-5 text-sky-500" />
            <span className="font-bold text-2xl" style={{ color: colorData.color }}>
              {habit.frequency}
            </span>
            <span className="text-center text-muted-foreground text-xs">目標回数</span>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">チェックイン履歴（過去6ヶ月）</CardTitle>
        </CardHeader>
        <CardContent>
          <HabitCalendarHeatmap accentColor={colorData.color} checkinDates={checkinDates} skipDates={skipDates} />
        </CardContent>
      </Card>
    </div>
  )
}
