'use client'

import { useTranslation } from 'react-i18next'
import { archiveHabitAction } from '@/app/actions/habits/archive'
import { Button } from '@/components/ui/button'
import { HabitActionDialog } from './HabitActionDialog'
import type { HabitDialogProps } from './types'

export function HabitArchiveDialog({
  habitId,
  habitName,
  trigger,
  onOptimistic,
  open,
  defaultOpen,
  onOpenChange,
}: HabitDialogProps) {
  const { t } = useTranslation()
  const shouldUseDefaultTrigger = trigger === undefined && open === undefined
  const resolvedTrigger =
    trigger ??
    (shouldUseDefaultTrigger ? (
      <Button className="col-span-2" variant="outline">
        {t('habits.dialog.archive.trigger')}
      </Button>
    ) : undefined)

  return (
    <HabitActionDialog
      action={archiveHabitAction}
      confirmLabel={t('habits.dialog.archive.confirm')}
      defaultOpen={defaultOpen}
      description={t('habits.dialog.archive.description', { habitName })}
      errorMessage={t('habits.dialog.archive.error')}
      habitId={habitId}
      onOpenChange={onOpenChange}
      onOptimistic={onOptimistic}
      open={open}
      successMessage={t('habits.dialog.archive.success')}
      title={t('habits.dialog.archive.title')}
      trigger={resolvedTrigger}
    />
  )
}
