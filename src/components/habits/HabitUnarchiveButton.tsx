'use client'

import { ArchiveRestore, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { unarchiveHabitAction } from '@/app/actions/habits/unarchive'
import { IconLabelButton } from '@/components/basics/IconLabelButton'
import { formatSerializableError } from '@/lib/errors/serializable'
import type { OptimisticHandler } from './types'

interface HabitUnarchiveButtonProps {
  habitId: string
  iconOnly?: boolean
  onOptimistic?: OptimisticHandler
}

export function HabitUnarchiveButton({ habitId, iconOnly = false, onOptimistic }: HabitUnarchiveButtonProps) {
  const router = useRouter()
  const [isRestoring, setIsRestoring] = useState(false)

  const handleUnarchive = async () => {
    const rollback = onOptimistic?.()

    setIsRestoring(true)
    try {
      const result = await unarchiveHabitAction(habitId)

      if (result.ok) {
        toast.success('習慣を復元しました')
        router.refresh()
        return
      }

      if (rollback) {
        rollback()
      }
      toast.error('復元に失敗しました', {
        description: formatSerializableError(result.error),
      })
    } catch (error) {
      if (rollback) {
        rollback()
      }
      toast.error('復元に失敗しました', {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setIsRestoring(false)
    }
  }

  const icon = isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4" />

  return (
    <IconLabelButton
      disabled={isRestoring}
      icon={icon}
      iconOnly={iconOnly}
      label="復元"
      onClick={handleUnarchive}
      size={iconOnly ? undefined : 'sm'}
      variant="outline"
    />
  )
}
