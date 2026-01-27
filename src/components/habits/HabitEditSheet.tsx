'use client'

import { Result } from '@praha/byethrow'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { updateHabitAction } from '@/app/actions/habits/update'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatSerializableError } from '@/lib/errors/serializable'
import { safeBuildHabitFormData } from '@/transforms/habitFormData'
import type { HabitWithProgress } from '@/types/habit'
import { HabitFormServer } from './HabitFormServer'

interface HabitEditSheetProps {
  habit: HabitWithProgress
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HabitEditSheet({ habit, open, onOpenChange }: HabitEditSheetProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: unknown) => {
    setIsSubmitting(true)

    const formData = safeBuildHabitFormData(data)
    if (!formData) {
      setIsSubmitting(false)
      toast.error('更新に失敗しました', {
        description: '入力内容を確認してください',
      })
      return
    }
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
