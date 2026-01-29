'use client'

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
import type { ServerActionResultAsync } from '@/lib/actions/result'
import { formatSerializableError, type SerializableHabitError } from '@/lib/errors/serializable'

interface HabitActionDialogProps {
  habitId: string
  trigger?: ReactNode | null
  title: string
  description: ReactNode
  confirmLabel: string
  confirmClassName?: string
  successMessage: string
  errorMessage: string
  action: (habitId: string) => ServerActionResultAsync<unknown, SerializableHabitError>
  retryOnError?: boolean
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

const runActionWithRetry = async <T,>(
  run: () => ServerActionResultAsync<T, SerializableHabitError>,
  maxRetries: number
): Promise<Awaited<ServerActionResultAsync<T, SerializableHabitError>>> => {
  let attempts = 0

  while (true) {
    try {
      return await run()
    } catch (error) {
      if (attempts >= maxRetries) {
        throw error
      }
      attempts += 1
    }
  }
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
  retryOnError = false,
  open,
  defaultOpen,
  onOpenChange,
}: HabitActionDialogProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(defaultOpen ?? false)
  const [isProcessing, setIsProcessing] = useState(false)
  const isControlled = open !== undefined
  const currentOpen = isControlled ? open : isOpen

  const handleOpenChange = (open: boolean) => {
    if (!isControlled) {
      setIsOpen(open)
    }
    onOpenChange?.(open)
  }

  const handleConfirm = async () => {
    if (isProcessing) {
      return
    }

    setIsProcessing(true)

    try {
      const maxRetries = retryOnError ? 1 : 0
      const result = await runActionWithRetry(() => action(habitId), maxRetries)

      if (result.ok) {
        toast.success(successMessage)
        handleOpenChange(false)
        router.refresh()
        return
      }

      toast.error(errorMessage, {
        description: formatSerializableError(result.error),
      })
    } catch (error) {
      toast.error(errorMessage, {
        description: error instanceof Error ? error.message : '通信エラーが発生しました',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <AlertDialog onOpenChange={handleOpenChange} open={currentOpen}>
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
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
