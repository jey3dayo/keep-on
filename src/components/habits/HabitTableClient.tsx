'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useState } from 'react'
import { Icon, normalizeIconName } from '@/components/Icon'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DEFAULT_HABIT_COLOR } from '@/constants/habit'
import { getColorById } from '@/constants/habit-data'
import type { HabitWithProgress } from '@/types/habit'
import { HabitEditSheet } from './HabitEditSheet'
import { HabitTableActions } from './HabitTableActions'
import { HabitUnarchiveButton } from './HabitUnarchiveButton'

function getPeriodLabel(period: 'daily' | 'weekly' | 'monthly'): string {
  switch (period) {
    case 'daily':
      return '毎日'
    case 'weekly':
      return '毎週'
    case 'monthly':
      return '毎月'
    default:
      return period
  }
}

interface HabitTableClientProps {
  habits: HabitWithProgress[]
}

export function HabitTableClient({ habits }: HabitTableClientProps) {
  const [editingHabit, setEditingHabit] = useState<HabitWithProgress | null>(null)

  const activeHabits = habits.filter((h) => !h.archived)
  const archivedHabits = habits.filter((h) => h.archived)

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
                        onEdit={() => setEditingHabit(habit)}
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
        <div className="space-y-4">
          <h2 className="font-bold text-muted-foreground text-xl">アーカイブ済み</h2>
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
                <TableRow key={habit.id}>
                  <TableCell>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Icon className="h-5 w-5 text-muted-foreground" name={normalizeIconName(habit.icon)} />
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{habit.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {habit.archivedAt ? format(new Date(habit.archivedAt), 'yyyy/MM/dd', { locale: ja }) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <HabitUnarchiveButton habitId={habit.id} />
                      <HabitTableActions
                        archived={habit.archived}
                        habitId={habit.id}
                        habitName={habit.name}
                        onEdit={() => setEditingHabit(habit)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 編集シート */}
      {editingHabit && (
        <HabitEditSheet
          habit={editingHabit}
          onOpenChange={(open) => !open && setEditingHabit(null)}
          open={!!editingHabit}
        />
      )}
    </div>
  )
}
