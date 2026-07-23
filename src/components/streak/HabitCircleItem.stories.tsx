import type { Meta, StoryObj } from '@storybook/react'
import type { HabitWithProgress } from '@/types/habit'
import { HabitCircleItem } from './HabitCircleItem'

const mockHabit: HabitWithProgress = {
  archived: false,
  archivedAt: null,
  color: 'blue',
  completionRate: 0,
  createdAt: new Date().toISOString(),
  currentProgress: 0,
  frequency: 1,
  icon: 'droplets',
  id: '1',
  name: '水を飲む',
  period: 'daily',
  streak: 3,
  updatedAt: new Date().toISOString(),
  userId: 'user1',
}

const bgColor = '#3b82f6'
const ringBgColor = 'rgba(255,255,255,0.2)'

const meta = {
  args: {
    bgColor,
    habit: mockHabit,
    isCompleted: false,
    onCheckin: () => undefined,
    onContextMenu: () => undefined,
    onLongPressEnd: () => undefined,
    onLongPressStart: () => undefined,
    ringBgColor,
  },
  component: HabitCircleItem,
  parameters: {
    backgrounds: {
      default: 'habit',
      values: [{ name: 'habit', value: bgColor }],
    },
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Streak/HabitCircleItem',
} satisfies Meta<typeof HabitCircleItem>

export default meta
type Story = StoryObj<typeof meta>

export const Incomplete: Story = {}

export const Completed: Story = {
  args: {
    habit: { ...mockHabit, completionRate: 100, currentProgress: 1 },
    isCompleted: true,
  },
}

export const WithFrequency: Story = {
  args: {
    habit: { ...mockHabit, currentProgress: 1, frequency: 3, icon: 'droplets', name: '水を飲む' },
  },
}

if (import.meta.vitest) {
  const { describe, expect, it } = await import('vitest')
  const { render } = await import('@testing-library/react')

  describe('HabitCircleItem Stories', () => {
    it('Incompleteがレンダリングされる', () => {
      const { container } = render(
        <HabitCircleItem
          bgColor={bgColor}
          habit={mockHabit}
          isCompleted={false}
          onCheckin={() => undefined}
          onContextMenu={() => undefined}
          onLongPressEnd={() => undefined}
          onLongPressStart={() => undefined}
          ringBgColor={ringBgColor}
        />
      )
      expect(container).not.toBeEmptyDOMElement()
    })
  })
}
