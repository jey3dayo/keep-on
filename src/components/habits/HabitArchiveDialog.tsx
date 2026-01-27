'use client'

import { Result } from '@praha/byethrow'
import { Archive, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { archiveHabitAction } from '@/app/actions/habits/archive'
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

interface HabitArchiveDialogProps {
  habitId: string
  habitName: string
}

export function HabitArchiveDialog({ habitId, habitName }: HabitArchiveDialogProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  const handleArchive = async () => {
    setIsArchiving(true)
    const result = await archiveHabitAction(habitId)
    setIsArchiving(false)

    if (Result.isSuccess(result)) {
      toast.success('習慣をアーカイブしました')
      setIsOpen(false)
      router.refresh()
    } else {
      toast.error('アーカイブに失敗しました', {
        description: formatSerializableError(result.error),
      })
    }
  }

  return (
    <AlertDialog onOpenChange={setIsOpen} open={isOpen}>
      <AlertDialogTrigger asChild>
        <Button aria-label="アーカイブ" size="icon" variant="ghost">
          <Archive className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>習慣をアーカイブしますか？</AlertDialogTitle>
          <AlertDialogDescription>
            「{habitName}」をアーカイブすると、一覧から非表示になります。後で復元することができます。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isArchiving}>キャンセル</AlertDialogCancel>
          <AlertDialogAction disabled={isArchiving} onClick={handleArchive}>
            {isArchiving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'アーカイブする'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
