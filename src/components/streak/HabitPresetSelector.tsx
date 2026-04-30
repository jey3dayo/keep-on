'use client'

import { ChevronRight, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/basics/Button'
import {
  getColorById,
  getIconById,
  type HabitPreset,
  habitPresets,
  type PresetCategory,
  presetCategories,
} from '@/constants/habit-data'
import { cn } from '@/lib/utils'

interface HabitPresetSelectorProps {
  onClose: () => void
  onCreateCustom: () => void
  onSelectPreset: (preset: HabitPreset) => void
}

export function HabitPresetSelector({ onClose, onSelectPreset, onCreateCustom }: HabitPresetSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory>('all')

  const bgColor = 'var(--orange-9)'
  const bgColorLight = 'var(--orange-8)'

  const filteredPresets = habitPresets.filter(
    (preset) => selectedCategory === 'all' || preset.category === selectedCategory
  )

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor }}>
      <header className="sticky top-0 z-10 px-4 pt-3 pb-4">
        <div className="relative flex items-center justify-center">
          <Button
            aria-label="習慣追加を閉じる"
            className="absolute left-0 h-10 w-10 rounded-full p-0"
            onClick={onClose}
            size="icon"
            style={{ backgroundColor: bgColorLight }}
            type="button"
            variant="ghost"
          >
            <X className="h-5 w-5 text-white" />
          </Button>

          <h1 className="font-semibold text-lg text-white">習慣を追加</h1>
        </div>
      </header>

      <div className="px-4 pb-4">
        <Button
          className="h-auto w-full justify-start rounded-xl px-4 py-4 text-left text-white/50 hover:bg-white/10"
          onClick={onCreateCustom}
          style={{ backgroundColor: bgColorLight }}
          type="button"
          variant="ghost"
        >
          習慣の名前を入力...
        </Button>
      </div>

      <div className="px-4 pb-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/20" />
          <p className="text-sm text-white/50">またはプリセットから選ぶ</p>
          <div className="h-px flex-1 bg-white/20" />
        </div>

        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
          {presetCategories.map((category) => {
            const IconComponent = category.icon
            const isSelected = selectedCategory === category.id
            return (
              <Button
                aria-label={`${category.label}カテゴリを表示`}
                aria-pressed={isSelected}
                className={cn(
                  'h-14 w-14 flex-shrink-0 rounded-full p-0 transition-all',
                  isSelected ? 'bg-white/90 shadow-lg' : 'hover:bg-white/20'
                )}
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                size="icon"
                style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.9)' : bgColorLight }}
                type="button"
                variant="ghost"
              >
                <IconComponent className="h-6 w-6" style={{ color: isSelected ? bgColor : 'white' }} />
              </Button>
            )
          })}
        </div>
      </div>

      <div className="px-4 pb-8">
        <div className="space-y-2">
          {filteredPresets.map((preset) => {
            const icon = getIconById(preset.iconId)
            const color = getColorById(preset.colorId)
            const IconComponent = icon.icon

            return (
              <Button
                className="h-auto w-full justify-start gap-3 rounded-xl px-4 py-3 hover:bg-white/10"
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                style={{ backgroundColor: bgColorLight }}
                type="button"
                variant="ghost"
              >
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: color.color }}
                >
                  <IconComponent className="h-6 w-6 text-white" />
                </div>

                <div className="flex flex-1 items-center gap-2 text-left">
                  <span className="font-medium text-white">{preset.name}</span>
                </div>

                <ChevronRight className="h-5 w-5 text-white/60" />
              </Button>
            )
          })}
        </div>

        {filteredPresets.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-white/60">プリセットが見つかりません</p>
          </div>
        )}
      </div>
    </div>
  )
}
