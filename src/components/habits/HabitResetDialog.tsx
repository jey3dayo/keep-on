'use client'

import { useTranslation } from 'react-i18next'
import { resetHabitProgressAction } from '@/app/actions/habits/reset'
import { Button } from '@/components/ui/button'
import { HabitActionDialog } from './HabitActionDialog'
import type { HabitDialogProps } from './types'

export function HabitResetDialog({
  habitId,
  habitName,
  trigger,
  open,
  defaultOpen,
  onOpenChange,
  onOptimistic,
}: HabitDialogProps) {
  const { t } = useTranslation()
  const shouldUseDefaultTrigger = trigger === undefined && open === undefined
  const resolvedTrigger =
    trigger ??
    (shouldUseDefaultTrigger ? (
      <Button className="col-span-2" variant="outline">
        {t('habits.dialog.reset.trigger')}
      </Button>
    ) : null)

  return (
    <HabitActionDialog
      action={resetHabitProgressAction}
      confirmClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      confirmLabel={t('habits.dialog.reset.confirm')}
      defaultOpen={defaultOpen}
      description={t('habits.dialog.reset.description', { habitName })}
      errorMessage={t('habits.dialog.reset.error')}
      habitId={habitId}
      onOpenChange={onOpenChange}
      onOptimistic={onOptimistic}
      open={open}
      successMessage={t('habits.dialog.reset.success')}
      title={t('habits.dialog.reset.title')}
      trigger={resolvedTrigger}
    />
  )
}
