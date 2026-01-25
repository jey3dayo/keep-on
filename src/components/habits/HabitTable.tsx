import { format } from 'date-fns'
import { Icon, normalizeIconName } from '@/components/Icon'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getHabitsByUserId } from '@/lib/queries/habit'
import { HabitTableActions } from './HabitTableActions'

interface HabitTableProps {
  userId: string
}

export async function HabitTable({ userId }: HabitTableProps) {
  const habits = await getHabitsByUserId(userId)

  if (habits.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed p-8">
        <div className="space-y-2 text-center">
          <p className="text-muted-foreground">習慣がまだ登録されていません</p>
          <p className="text-muted-foreground text-sm">新しい習慣を作成してみましょう</p>
        </div>
      </div>
    )
  }

  return (
    <Table>
      <TableCaption>あなたの習慣一覧（{habits.length}件）</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[60px]">アイコン</TableHead>
          <TableHead>名前</TableHead>
          <TableHead className="hidden w-[120px] md:table-cell">作成日</TableHead>
          <TableHead className="w-[100px] text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {habits.map((habit) => (
          <TableRow key={habit.id}>
            <TableCell>
              <Icon className="text-foreground" name={normalizeIconName(habit.icon)} size={20} />
            </TableCell>
            <TableCell className="font-medium">{habit.name}</TableCell>
            <TableCell className="hidden md:table-cell">{format(habit.createdAt, 'yyyy/MM/dd')}</TableCell>
            <TableCell>
              <HabitTableActions habitId={habit.id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
