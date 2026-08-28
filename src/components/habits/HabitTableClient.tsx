'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type MouseEvent, useCallback, useState } from 'react'
import { Button } from '@/components/basics/Button'
import { Icon, normalizeIconName } from '@/components/basics/Icon'
import { IconLabelButton } from '@/components/basics/IconLabelButton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DEFAULT_HABIT_COLOR } from '@/constants/habit'
import { getColorById } from '@/constants/habit-data'
import { getPeriodLabel } from '@/lib/utils/habits'
import type { HabitWithProgress } from '@/types/habit'
import { HabitDeleteDialog } from './HabitDeleteDialog'
import { HabitTableActions } from './HabitTableActions'
import { HabitUnarchiveButton } from './HabitUnarchiveButton'
import type { OptimisticRollback } from './types'

interface HabitTableClientProps {
  habits: HabitWithProgress[]
}

interface ActiveHabitRowProps {
  habit: HabitWithProgress
  onArchive: (habitId: string) => OptimisticRollback
  onEdit: (habitId: string) => void
  onRowClick: (event: MouseEvent<HTMLTableRowElement>, habitId: string) => void
}

function ActiveHabitRow({ habit, onArchive, onEdit, onRowClick }: ActiveHabitRowProps) {
  const { color: bgColor, foreground: iconColor } = getColorById(habit.color ?? DEFAULT_HABIT_COLOR)
  const handleRowClick = useCallback(
    (event: MouseEvent<HTMLTableRowElement>) => onRowClick(event, habit.id),
    [habit.id, onRowClick]
  )
  const handleArchive = useCallback(() => onArchive(habit.id), [habit.id, onArchive])
  const handleEdit = useCallback(() => onEdit(habit.id), [habit.id, onEdit])

  return (
    <TableRow
      className="cursor-pointer transition-colors duration-150 hover:bg-muted/40 active:bg-muted/60 active:duration-75 motion-reduce:transition-none"
      onClick={handleRowClick}
    >
      <TableCell>
        <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: bgColor }}>
          <Icon className="h-5 w-5" name={normalizeIconName(habit.icon)} style={{ color: iconColor }} />
        </div>
      </TableCell>
      <TableCell className="font-medium">
        <Link
          className="whitespace-nowrap rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          href={`/habits/${habit.id}`}
        >
          {habit.name}
        </Link>
      </TableCell>
      <TableCell>{getPeriodLabel(habit.period)}</TableCell>
      <TableCell className="tabular-nums">{habit.frequency}</TableCell>
      <TableCell className="hidden tabular-nums md:table-cell">
        {format(new Date(habit.createdAt), 'yyyy/MM/dd', { locale: ja })}
      </TableCell>
      <TableCell className="text-right">
        <HabitTableActions
          archived={habit.archived}
          habitId={habit.id}
          habitName={habit.name}
          onArchiveOptimistic={handleArchive}
          onEdit={handleEdit}
        />
      </TableCell>
    </TableRow>
  )
}

interface ArchivedHabitRowProps {
  habit: HabitWithProgress
  onDelete: (habitId: string) => OptimisticRollback
  onUnarchive: (habitId: string) => OptimisticRollback
}

function ArchivedHabitRow({ habit, onDelete, onUnarchive }: ArchivedHabitRowProps) {
  const handleUnarchive = useCallback(() => onUnarchive(habit.id), [habit.id, onUnarchive])
  const handleDelete = useCallback(() => onDelete(habit.id), [habit.id, onDelete])

  return (
    <TableRow className="bg-muted/20 text-muted-foreground hover:bg-muted/30">
      <TableCell>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/70">
          <Icon className="h-5 w-5 text-muted-foreground/80" name={normalizeIconName(habit.icon)} />
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          <span className="whitespace-nowrap">{habit.name}</span>
          <span className="whitespace-nowrap rounded-full border border-muted-foreground/30 px-2 py-0.5 font-medium text-muted-foreground text-xs">
            アーカイブ
          </span>
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap tabular-nums">
        {habit.archivedAt ? format(new Date(habit.archivedAt), 'yyyy/MM/dd', { locale: ja }) : '-'}
      </TableCell>
      <TableCell className="text-right">
        {/*
            モバイルでは flex-col で「復元」「完全に削除」が縦に積まれる。
            各ボタンの当たり判定エキスパンダ(after:-inset-y-1.5 = 6px)が上下で
            接するよう gap-3(12px = 6px×2)を確保し、破壊的操作である「完全に削除」の
            判定領域が「復元」側へ食い込まないようにする(gap-2 のままだと 4px 重なる)
          */}
        <div className="flex flex-col items-end gap-3 sm:flex-row sm:justify-end">
          <HabitUnarchiveButton habitId={habit.id} onOptimistic={handleUnarchive} />
          <HabitDeleteDialog
            habitId={habit.id}
            habitName={habit.name}
            onOptimistic={handleDelete}
            trigger={
              <IconLabelButton
                // 見た目の寸法(h-8=32px)は変えず、::after のエキスパンダで
                // 縦方向のみ当たり判定を 44px(inset-y-1.5=6px×2 + 32px)へ広げる
                className="relative shrink-0 whitespace-nowrap after:absolute after:-inset-y-1.5 after:content-['']"
                icon={<Trash2 className="h-4 w-4" />}
                label="完全に削除"
                size="sm"
                variant="outline"
              />
            }
          />
        </div>
      </TableCell>
    </TableRow>
  )
}

export function HabitTableClient({ habits }: HabitTableClientProps) {
  const router = useRouter()
  const [prevHabits, setPrevHabits] = useState(habits)
  const [optimisticHabits, setOptimisticHabits] = useState(habits)

  if (prevHabits !== habits) {
    setPrevHabits(habits)
    setOptimisticHabits(habits)
  }

  const runOptimisticUpdate = useCallback(
    (updater: (current: HabitWithProgress[]) => HabitWithProgress[]): OptimisticRollback => {
      let previousState: HabitWithProgress[] | null = null
      setOptimisticHabits((current) => {
        previousState = current
        return updater(current)
      })
      return () => {
        if (previousState) {
          setOptimisticHabits(previousState)
        }
      }
    },
    []
  )

  const archiveOptimistically = useCallback(
    (habitId: string) =>
      runOptimisticUpdate((current) =>
        current.map((habit) =>
          habit.id === habitId
            ? {
                ...habit,
                archived: true,
                archivedAt: habit.archivedAt ?? new Date().toISOString(),
              }
            : habit
        )
      ),
    [runOptimisticUpdate]
  )

  const unarchiveOptimistically = useCallback(
    (habitId: string) =>
      runOptimisticUpdate((current) =>
        current.map((habit) =>
          habit.id === habitId
            ? {
                ...habit,
                archived: false,
                archivedAt: null,
              }
            : habit
        )
      ),
    [runOptimisticUpdate]
  )

  const deleteOptimistically = useCallback(
    (habitId: string) => runOptimisticUpdate((current) => current.filter((habit) => habit.id !== habitId)),
    [runOptimisticUpdate]
  )

  const handleRowClick = useCallback(
    (event: MouseEvent<HTMLTableRowElement>, habitId: string) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      if (
        event.target instanceof Element &&
        event.target.closest('a, button, input, select, textarea, [role="button"]')
      ) {
        return
      }

      router.push(`/habits/${habitId}`)
    },
    [router]
  )
  const handleEdit = useCallback((habitId: string) => router.push(`/habits/${habitId}/edit`), [router])

  const activeHabits = optimisticHabits.filter((h) => !h.archived)
  const archivedHabits = optimisticHabits
    .filter((h) => h.archived)
    .sort((a, b) => {
      const aTime = a.archivedAt ? new Date(a.archivedAt).getTime() : 0
      const bTime = b.archivedAt ? new Date(b.archivedAt).getTime() : 0
      return bTime - aTime
    })

  return (
    <div className="space-y-6">
      {/* アクティブな習慣 */}
      <div className="space-y-4">
        <h2 className="font-semibold text-lg tracking-tight">アクティブな習慣</h2>
        {activeHabits.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border/70 bg-card/80 shadow-sm">
              <Icon className="h-8 w-8 text-muted-foreground" name="target" />
            </div>
            <p className="mb-1 font-semibold text-base">習慣がまだ登録されていません</p>
            <p className="mb-4 text-muted-foreground text-sm">新しい習慣を作成しましょう</p>
            <Button asChild size="lg" variant="default">
              <Link href="/habits/new?step=preset">
                <Icon className="mr-2" name="plus" size={20} />
                新しい習慣
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] whitespace-nowrap">アイコン</TableHead>
                  <TableHead>名前</TableHead>
                  <TableHead>期間</TableHead>
                  <TableHead>頻度</TableHead>
                  <TableHead className="hidden md:table-cell">作成日</TableHead>
                  <TableHead className="text-right">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeHabits.map((habit) => (
                  <ActiveHabitRow
                    habit={habit}
                    key={habit.id}
                    onArchive={archiveOptimistically}
                    onEdit={handleEdit}
                    onRowClick={handleRowClick}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* アーカイブ済み習慣 */}
      {archivedHabits.length > 0 && (
        <div className="space-y-4 rounded-xl border border-muted/60 bg-muted/20 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium text-muted-foreground text-sm">アーカイブ済み</h2>
            <span className="rounded-full border border-muted-foreground/30 px-2 py-0.5 text-muted-foreground text-xs">
              {archivedHabits.length}件
            </span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] whitespace-nowrap">アイコン</TableHead>
                  <TableHead>名前</TableHead>
                  <TableHead>アーカイブ日</TableHead>
                  <TableHead className="text-right">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivedHabits.map((habit) => (
                  <ArchivedHabitRow
                    habit={habit}
                    key={habit.id}
                    onDelete={deleteOptimistically}
                    onUnarchive={unarchiveOptimistically}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
