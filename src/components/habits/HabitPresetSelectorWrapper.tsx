'use client'

import { useRouter } from 'next/navigation'
import { HabitPresetSelector } from '@/components/streak/HabitPresetSelector'

export function HabitPresetSelectorWrapper() {
  const router = useRouter()

  return (
    <HabitPresetSelector
      onClose={() => router.back()}
      onCreateCustom={() => {
        router.push('/habits/new?step=form')
      }}
      onSelectPreset={(preset) => {
        router.push(`/habits/new?step=form&preset=${preset.id}`)
      }}
    />
  )
}
