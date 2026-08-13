'use client'

import { ChevronRight, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory>('all')

  const bgColor = 'var(--orange-9)'
  const bgColorLight = 'var(--orange-8)'
  const handleCategoryChange = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const category = presetCategories.find((candidate) => candidate.id === event.currentTarget.dataset.category)
    if (category) {
      setSelectedCategory(category.id)
    }
  }, [])
  const handlePresetSelect = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const preset = habitPresets.find((candidate) => candidate.id === event.currentTarget.dataset.preset)
      if (preset) {
        onSelectPreset(preset)
      }
    },
    [onSelectPreset]
  )

  const filteredPresets = habitPresets.filter(
    (preset) => selectedCategory === 'all' || preset.category === selectedCategory
  )

  return (
    <div className="min-h-dvh" style={{ backgroundColor: bgColor }}>
      <header className="sticky top-0 z-10 px-4 pt-3 pb-4">
        <div className="relative flex items-center justify-center">
          <Button
            aria-label={t('habits.presetSelector.closeLabel')}
            className="absolute left-0 h-10 w-10 rounded-full p-0"
            onClick={onClose}
            size="icon"
            style={{ backgroundColor: bgColorLight }}
            type="button"
            variant="ghost"
          >
            <X className="h-5 w-5 text-white" />
          </Button>

          {/* ページの h1 は SiteHeader が持つ。ここはセクション見出しなので h2 */}
          <h2 className="font-semibold text-lg text-white">{t('habits.presetSelector.title')}</h2>
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
          {t('habits.presetSelector.customNamePlaceholder')}
        </Button>
      </div>

      <div className="px-4 pb-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/20" />
          <p className="text-sm text-white/50">{t('habits.presetSelector.orPreset')}</p>
          <div className="h-px flex-1 bg-white/20" />
        </div>

        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
          {presetCategories.map((category) => {
            const IconComponent = category.icon
            const isSelected = selectedCategory === category.id
            return (
              <Button
                aria-label={t('habits.presetSelector.categoryLabel', { label: category.label })}
                aria-pressed={isSelected}
                className={cn(
                  'h-14 w-14 flex-shrink-0 rounded-full p-0 transition-[background-color,box-shadow,transform]',
                  isSelected ? 'bg-white/90 shadow-lg' : 'hover:bg-white/20'
                )}
                data-category={category.id}
                key={category.id}
                onClick={handleCategoryChange}
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
                data-preset={preset.id}
                key={preset.id}
                onClick={handlePresetSelect}
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
            <p className="text-white/60">{t('habits.presetSelector.empty')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
