'use client'

import { Button } from '@/components/basics/Button'
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
              <Button
                aria-label={iconName}
                aria-pressed={selectedIcon === iconName}
                className={cn(
                  'h-auto rounded-lg p-3',
                  'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
                  selectedIcon === iconName ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                )}
                key={iconName}
                onClick={() => onIconSelect(iconName)}
                type="button"
                variant="ghost"
              >
                <Icon className="h-6 w-6" name={iconName} />
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
