'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { RETRY_DELAY_MS, RETRY_MAX_ATTEMPTS } from '@/constants/retry'
import type { ServerActionResultAsync } from '@/lib/actions/result'
import { formatSerializableError, type SerializableHabitError } from '@/lib/errors/serializable'
import type { OptimisticHandler } from './types'

interface HabitActionDialogProps {
  action: (habitId: string) => ServerActionResultAsync<unknown, SerializableHabitError>
  confirmClassName?: string
  confirmLabel: string
  defaultOpen?: boolean
  description: ReactNode
  errorMessage: string
  habitId: string
  onOpenChange?: (open: boolean) => void
  onOptimistic?: OptimisticHandler
  open?: boolean
  retryOnError?: boolean
  successMessage: string
  title: string
  trigger?: ReactNode | null
}

const waitForRetry = (delayMs: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs)
  })

const runActionWithRetry = async <T,>(
  run: () => ServerActionResultAsync<T, SerializableHabitError>,
  retryOnError: boolean
): Promise<Awaited<ServerActionResultAsync<T, SerializableHabitError>>> => {
  const maxAttempts = Math.max(1, retryOnError ? RETRY_MAX_ATTEMPTS : 1)
  let lastError: unknown = null

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await run()
    } catch (error) {
      lastError = error
      if (attempt < maxAttempts - 1 && RETRY_DELAY_MS > 0) {
        await waitForRetry(RETRY_DELAY_MS)
      }
    }
  }

  throw lastError ?? new Error('処理に失敗しました')
}

export function HabitActionDialog({
  habitId,
  trigger,
  onOptimistic,
  title,
  description,
  confirmLabel,
  confirmClassName,
  successMessage,
  errorMessage,
  action,
  retryOnError = true,
  open,
  defaultOpen,
  onOpenChange,
}: HabitActionDialogProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(defaultOpen ?? false)
  const [isProcessing, setIsProcessing] = useState(false)
  const isControlled = open !== undefined
  const currentOpen = isControlled ? open : isOpen

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setIsOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }

  const handleConfirm = async () => {
    if (isProcessing) {
      return
    }

    setIsProcessing(true)
    const rollback = onOptimistic?.()

    try {
      const result = await runActionWithRetry(() => action(habitId), retryOnError)

      if (result.ok) {
        toast.success(successMessage)
        handleOpenChange(false)
        router.refresh()
        return
      }

      if (rollback) {
        rollback()
      }
      toast.error(errorMessage, {
        description: formatSerializableError(result.error),
      })
    } catch (error) {
      if (rollback) {
        rollback()
      }
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
          <AlertDialogCancel disabled={isProcessing}>{t('habits.dialog.cancel')}</AlertDialogCancel>
          <AlertDialogAction className={confirmClassName} disabled={isProcessing} onClick={handleConfirm}>
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>{confirmLabel}</span>}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
