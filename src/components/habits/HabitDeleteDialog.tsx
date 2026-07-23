'use client'

import { useTranslation } from 'react-i18next'
import { deleteHabitAction } from '@/app/actions/habits/delete'
import { Button } from '@/components/ui/button'
import { HabitActionDialog } from './HabitActionDialog'
import type { HabitDialogProps } from './types'

export function HabitDeleteDialog({
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
        {t('habits.dialog.delete.trigger')}
      </Button>
    ) : undefined)

  return (
    <HabitActionDialog
      action={deleteHabitAction}
      confirmClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      confirmLabel={t('habits.dialog.delete.confirm')}
      defaultOpen={defaultOpen}
      description={t('habits.dialog.delete.description', { habitName })}
      errorMessage={t('habits.dialog.delete.error')}
      habitId={habitId}
      onOpenChange={onOpenChange}
      onOptimistic={onOptimistic}
      open={open}
      retryOnError={false}
      successMessage={t('habits.dialog.delete.success')}
      title={t('habits.dialog.delete.title')}
      trigger={resolvedTrigger}
    />
  )
}
