'use client'

import { Result } from '@praha/byethrow'
import { ArchiveRestore, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { unarchiveHabitAction } from '@/app/actions/habits/unarchive'
import { Button } from '@/components/ui/button'
import { formatSerializableError } from '@/lib/errors/serializable'

interface HabitUnarchiveButtonProps {
  habitId: string
}

export function HabitUnarchiveButton({ habitId }: HabitUnarchiveButtonProps) {
  const router = useRouter()
  const [isRestoring, setIsRestoring] = useState(false)

  const handleUnarchive = async () => {
    setIsRestoring(true)
    const result = await unarchiveHabitAction(habitId)
    setIsRestoring(false)

    if (Result.isSuccess(result)) {
      toast.success('習慣を復元しました')
      router.refresh()
    } else {
      toast.error('復元に失敗しました', {
        description: formatSerializableError(result.error),
      })
    }
  }

  return (
    <Button disabled={isRestoring} onClick={handleUnarchive} size="sm" variant="outline">
      {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4" />}
      復元
    </Button>
  )
}
