'use client'

import { Icon, type IconName } from '@/components/basics/Icon'
import { cn } from '@/lib/utils'

interface IconPickerProps {
  selectedIcon: IconName
  onIconSelect: (iconName: IconName) => void
}

interface IconCategory {
  name: string
  icons: IconName[]
}

const categories: IconCategory[] = [
  {
    name: '健康・運動',
    icons: ['footprints', 'pill', 'heart', 'dumbbell', 'bike', 'droplets', 'apple', 'bed'],
  },
  {
    name: '生産性・学習',
    icons: ['book-open', 'pencil', 'brain', 'clock', 'target', 'timer'],
  },
  {
    name: 'ライフスタイル',
    icons: ['coffee', 'music', 'sun', 'ban', 'smile', 'users'],
  },
]

export function IconPicker({ selectedIcon, onIconSelect }: IconPickerProps) {
  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div key={category.name}>
          <h3 className="mb-3 font-semibold text-muted-foreground text-sm">{category.name}</h3>
          <div className="grid grid-cols-4 gap-2">
            {category.icons.map((iconName) => (
              <button
                aria-label={iconName}
                aria-pressed={selectedIcon === iconName}
                className={cn(
                  'flex items-center justify-center rounded-lg p-3 transition-colors',
                  'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
                  selectedIcon === iconName ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                )}
                key={iconName}
                onClick={() => onIconSelect(iconName)}
                type="button"
              >
                <Icon className="h-6 w-6" name={iconName} />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
