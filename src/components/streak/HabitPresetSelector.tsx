'use client'

import { ChevronRight, Search, X } from 'lucide-react'
import { useState } from 'react'
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
  onSelectPreset: (preset: HabitPreset) => void
  onCreateCustom: () => void
}

export function HabitPresetSelector({ onClose, onSelectPreset, onCreateCustom }: HabitPresetSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const bgColor = 'oklch(0.70 0.18 45)'
  const bgColorLight = 'oklch(0.65 0.16 45)'

  const filteredPresets = habitPresets.filter((preset) => {
    const matchesCategory = selectedCategory === 'all' || preset.category === selectedCategory
    const matchesSearch = preset.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && (searchQuery === '' || matchesSearch)
  })

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor }}>
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
          onClick={onClose}
          style={{ backgroundColor: bgColorLight }}
          type="button"
        >
          <X className="h-5 w-5 text-white" />
        </button>

        <h1 className="font-semibold text-lg text-white">タスクを追加</h1>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
          onClick={() => setShowSearch(!showSearch)}
          style={{ backgroundColor: bgColorLight }}
          type="button"
        >
          <Search className="h-5 w-5 text-white" />
        </button>
      </header>

      {showSearch && (
        <div className="px-4 pb-3">
          <input
            autoFocus
            className="w-full rounded-xl px-4 py-3 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="プリセットを検索..."
            style={{ backgroundColor: bgColorLight }}
            type="text"
            value={searchQuery}
          />
        </div>
      )}

      <div className="px-4 pb-4">
        <div className="scrollbar-hide flex gap-2 overflow-x-auto">
          {presetCategories.map((category) => {
            const IconComponent = category.icon
            const isSelected = selectedCategory === category.id
            return (
              <button
                className={cn(
                  'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full transition-all',
                  isSelected ? 'bg-white/90 shadow-lg' : 'hover:bg-white/20'
                )}
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.9)' : bgColorLight }}
                type="button"
              >
                <IconComponent className="h-6 w-6" style={{ color: isSelected ? bgColor : 'white' }} />
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-4 pb-4">
        <p className="text-sm text-white/80 leading-relaxed">
          プリセットを選択するか、自身でカスタムタスクを作成できます。
        </p>
      </div>

      <div className="px-4 pb-2">
        <p className="mb-2 text-sm text-white/70">自身で作成:</p>
        <button
          className="w-full rounded-xl px-4 py-4 text-left text-white/50 transition-colors hover:bg-white/10"
          onClick={onCreateCustom}
          style={{ backgroundColor: bgColorLight }}
          type="button"
        >
          タスクのタイトルを入力...
        </button>
      </div>

      <div className="px-4 pt-4">
        <p className="mb-3 text-sm text-white/70">またはプリセットを選択:</p>

        <div className="space-y-2">
          {filteredPresets.map((preset) => {
            const icon = getIconById(preset.iconId)
            const color = getColorById(preset.colorId)
            const IconComponent = icon.icon

            return (
              <button
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-white/10"
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                style={{ backgroundColor: bgColorLight }}
                type="button"
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
              </button>
            )
          })}
        </div>

        {filteredPresets.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-white/60">プリセットが見つかりません</p>
          </div>
        )}
      </div>

      <div className="h-8" />
    </div>
  )
}
