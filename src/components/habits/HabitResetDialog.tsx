'use client'

import { Result } from '@praha/byethrow'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type ReactNode, useState } from 'react'
import { toast } from 'sonner'
import { resetHabitProgressAction } from '@/app/actions/habits/reset'
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

interface HabitResetDialogProps {
  habitId: string
  habitName: string
  trigger?: ReactNode | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function HabitResetDialog({ habitId, habitName, trigger, open, onOpenChange }: HabitResetDialogProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const isControlled = open !== undefined
  const dialogOpen = isControlled ? open : isOpen

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setIsOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }

  const handleConfirm = async () => {
    setIsProcessing(true)
    const result = await resetHabitProgressAction(habitId)
    setIsProcessing(false)

    if (Result.isSuccess(result)) {
      toast.success('進捗をリセットしました')
      handleOpenChange(false)
      router.refresh()
      return
    }

    toast.error('進捗のリセットに失敗しました', {
      description: formatSerializableError(result.error),
    })
  }

  const defaultTrigger = (
    <Button className="col-span-2" variant="outline">
      進捗をリセット
    </Button>
  )
  let resolvedTrigger = trigger ?? null
  if (trigger === undefined) {
    resolvedTrigger = isControlled ? null : defaultTrigger
  }

  return (
    <AlertDialog onOpenChange={handleOpenChange} open={dialogOpen}>
      {resolvedTrigger ? <AlertDialogTrigger asChild>{resolvedTrigger}</AlertDialogTrigger> : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>進捗をリセットしますか？</AlertDialogTitle>
          <AlertDialogDescription>
            「{habitName}」の今日のチェックインを削除して、進捗を0に戻します
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isProcessing}
            onClick={handleConfirm}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'リセット'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
