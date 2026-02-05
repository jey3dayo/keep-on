import { useCallback, useState } from 'react'
import type { HabitPreset } from '@/constants/habit-data'

export interface UsePresetSelectionReturn {
  selectedPreset: HabitPreset | null
  selectPreset: (preset: HabitPreset) => void
  clearPreset: () => void
}

export function usePresetSelection(): UsePresetSelectionReturn {
  const [selectedPreset, setSelectedPreset] = useState<HabitPreset | null>(null)

  const selectPreset = useCallback((preset: HabitPreset) => {
    setSelectedPreset(preset)
  }, [])

  const clearPreset = useCallback(() => {
    setSelectedPreset(null)
  }, [])

  return {
    selectedPreset,
    selectPreset,
    clearPreset,
  }
}
