'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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

export function HabitTableClient({ habits }: HabitTableClientProps) {
  const router = useRouter()
  const [optimisticHabits, setOptimisticHabits] = useState(habits)

  useEffect(() => {
    setOptimisticHabits(habits)
  }, [habits])

  const runOptimisticUpdate = (updater: (current: HabitWithProgress[]) => HabitWithProgress[]): OptimisticRollback => {
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
  }

  const archiveOptimistically = (habitId: string) =>
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
    )

  const unarchiveOptimistically = (habitId: string) =>
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
    )

  const deleteOptimistically = (habitId: string) =>
    runOptimisticUpdate((current) => current.filter((habit) => habit.id !== habitId))

  const activeHabits = optimisticHabits.filter((h) => !h.archived)
  const archivedHabits = optimisticHabits
    .filter((h) => h.archived)
    .sort((a, b) => {
      const aTime = a.archivedAt ? new Date(a.archivedAt).getTime() : 0
      const bTime = b.archivedAt ? new Date(b.archivedAt).getTime() : 0
      return bTime - aTime
    })

  return (
    <div className="space-y-8">
      {/* アクティブな習慣 */}
      <div className="space-y-4">
        <h2 className="font-bold text-xl">アクティブな習慣</h2>
        {activeHabits.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">習慣がありません。新しい習慣を作成しましょう。</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">アイコン</TableHead>
                <TableHead>名前</TableHead>
                <TableHead>期間</TableHead>
                <TableHead>頻度</TableHead>
                <TableHead className="hidden md:table-cell">作成日</TableHead>
                <TableHead className="w-[100px] text-right">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeHabits.map((habit) => {
                const bgColor = getColorById(habit.color ?? DEFAULT_HABIT_COLOR).color

                return (
                  <TableRow key={habit.id}>
                    <TableCell>
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: bgColor }}
                      >
                        <Icon className="h-5 w-5 text-white" name={normalizeIconName(habit.icon)} />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{habit.name}</TableCell>
                    <TableCell>{getPeriodLabel(habit.period)}</TableCell>
                    <TableCell>{habit.frequency}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {format(new Date(habit.createdAt), 'yyyy/MM/dd', { locale: ja })}
                    </TableCell>
                    <TableCell className="text-right">
                      <HabitTableActions
                        archived={habit.archived}
                        habitId={habit.id}
                        habitName={habit.name}
                        onArchiveOptimistic={() => archiveOptimistically(habit.id)}
                        onEdit={() => router.push(`/habits/${habit.id}/edit`)}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* アーカイブ済み習慣 */}
      {archivedHabits.length > 0 && (
        <div className="space-y-4 rounded-lg border border-muted/60 bg-muted/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-muted-foreground text-xl">アーカイブ済み</h2>
            <span className="rounded-full border border-muted-foreground/30 px-2 py-0.5 text-muted-foreground text-xs">
              {archivedHabits.length}件
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">アイコン</TableHead>
                <TableHead>名前</TableHead>
                <TableHead>アーカイブ日</TableHead>
                <TableHead className="w-[200px] text-right">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archivedHabits.map((habit) => (
                <TableRow className="bg-muted/20 text-muted-foreground hover:bg-muted/30" key={habit.id}>
                  <TableCell>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/70">
                      <Icon className="h-5 w-5 text-muted-foreground/80" name={normalizeIconName(habit.icon)} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{habit.name}</span>
                      <span className="rounded-full border border-muted-foreground/30 px-2 py-0.5 font-medium text-[10px] text-muted-foreground">
                        アーカイブ
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {habit.archivedAt ? format(new Date(habit.archivedAt), 'yyyy/MM/dd', { locale: ja }) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <HabitUnarchiveButton habitId={habit.id} onOptimistic={() => unarchiveOptimistically(habit.id)} />
                      <HabitDeleteDialog
                        habitId={habit.id}
                        habitName={habit.name}
                        onOptimistic={() => deleteOptimistically(habit.id)}
                        trigger={
                          <IconLabelButton
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
