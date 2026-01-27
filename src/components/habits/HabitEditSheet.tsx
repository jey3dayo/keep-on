'use client'

import { Result } from '@praha/byethrow'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { updateHabitAction } from '@/app/actions/habits/update'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatSerializableError } from '@/lib/errors/serializable'
import type { HabitWithProgress } from '@/types/habit'
import { HabitFormServer } from './HabitFormServer'

interface HabitEditSheetProps {
  habit: HabitWithProgress
  open: boolean
  onOpenChange: (open: boolean) => void
}

function habitDataToFormData(data: unknown): FormData {
  const formData = new FormData()

  if (data && typeof data === 'object') {
    if ('name' in data && typeof data.name === 'string') {
      formData.append('name', data.name)
    }
    if ('icon' in data && typeof data.icon === 'string') {
      formData.append('icon', data.icon)
    }
    if ('color' in data && typeof data.color === 'string') {
      formData.append('color', data.color)
    }
    if ('period' in data && typeof data.period === 'string') {
      formData.append('period', data.period)
    }
    if ('frequency' in data && typeof data.frequency === 'number') {
      formData.append('frequency', String(data.frequency))
    }
  }

  return formData
}

export function HabitEditSheet({ habit, open, onOpenChange }: HabitEditSheetProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: unknown) => {
    setIsSubmitting(true)

    const formData = habitDataToFormData(data)
    const result = await updateHabitAction(habit.id, formData)
    setIsSubmitting(false)

    if (Result.isSuccess(result)) {
      toast.success('習慣を更新しました')
      onOpenChange(false)
      router.refresh()
    } else {
      toast.error('更新に失敗しました', {
        description: formatSerializableError(result.error),
      })
    }
  }

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="h-[90vh]" side="bottom">
        <SheetHeader>
          <SheetTitle>習慣を編集</SheetTitle>
        </SheetHeader>
        {isSubmitting ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <HabitFormServer initialData={habit} onSubmit={handleSubmit} submitLabel="更新する" />
        )}
      </SheetContent>
    </Sheet>
  )
}
