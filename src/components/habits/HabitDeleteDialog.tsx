'use client'

import { Result } from '@praha/byethrow'
import { Loader2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { deleteHabitAction } from '@/app/actions/habits/delete'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { formatSerializableError } from '@/lib/errors/serializable'

interface HabitDeleteDialogProps {
  habitId: string
  habitName: string
}

export function HabitDeleteDialog({ habitId, habitName }: HabitDeleteDialogProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    const result = await deleteHabitAction(habitId)
    setIsDeleting(false)

    if (Result.isSuccess(result)) {
      toast.success('習慣を完全に削除しました')
      setIsOpen(false)
      router.refresh()
    } else {
      toast.error('削除に失敗しました', {
        description: formatSerializableError(result.error),
      })
    }
  }

  return (
    <AlertDialog onOpenChange={setIsOpen} open={isOpen}>
      <AlertDialogTrigger asChild>
        <Button aria-label="完全削除" className="text-destructive hover:text-destructive" size="icon" variant="ghost">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>習慣を完全に削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            「{habitName}」を完全に削除すると、この習慣と関連する全ての記録が削除されます。この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : '完全に削除する'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
