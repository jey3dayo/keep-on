'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { HabitPresetSelector } from '@/components/streak/HabitPresetSelector'

export function HabitPresetSelectorWrapper() {
  const router = useRouter()
  const handleClose = useCallback(() => router.back(), [router])
  const handleCreateCustom = useCallback(() => {
    router.replace('/habits/new?step=form')
  }, [router])
  const handleSelectPreset = useCallback(
    (preset: Parameters<React.ComponentProps<typeof HabitPresetSelector>['onSelectPreset']>[0]) => {
      router.replace(`/habits/new?step=form&preset=${preset.id}`)
    },
    [router]
  )

  return (
    <HabitPresetSelector
      onClose={handleClose}
      onCreateCustom={handleCreateCustom}
      onSelectPreset={handleSelectPreset}
    />
  )
}
