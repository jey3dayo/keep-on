'use client'

import { Result } from '@praha/byethrow'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type ReactNode, useState } from 'react'
import { toast } from 'sonner'
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
import { formatSerializableError, type SerializableHabitError } from '@/lib/errors/serializable'

interface HabitActionDialogProps {
  habitId: string
  trigger: ReactNode
  title: string
  description: ReactNode
  confirmLabel: string
  confirmClassName?: string
  successMessage: string
  errorMessage: string
  action: (habitId: string) => Result.ResultAsync<unknown, SerializableHabitError>
}

export function HabitActionDialog({
  habitId,
  trigger,
  title,
  description,
  confirmLabel,
  confirmClassName,
  successMessage,
  errorMessage,
  action,
}: HabitActionDialogProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleConfirm = async () => {
    setIsProcessing(true)
    const result = await action(habitId)
    setIsProcessing(false)

    if (Result.isSuccess(result)) {
      toast.success(successMessage)
      setIsOpen(false)
      router.refresh()
      return
    }

    toast.error(errorMessage, {
      description: formatSerializableError(result.error),
    })
  }

  return (
    <AlertDialog onOpenChange={setIsOpen} open={isOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>キャンセル</AlertDialogCancel>
          <AlertDialogAction className={confirmClassName} disabled={isProcessing} onClick={handleConfirm}>
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
