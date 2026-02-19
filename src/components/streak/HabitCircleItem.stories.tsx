import type { Meta, StoryObj } from '@storybook/react'
import type { HabitWithProgress } from '@/types/habit'
import { HabitCircleItem } from './HabitCircleItem'

const mockHabit: HabitWithProgress = {
  id: '1',
  name: '水を飲む',
  icon: 'droplets',
  color: 'blue',
  frequency: 1,
  currentProgress: 0,
  completionRate: 0,
  streak: 3,
  period: 'daily',
  archived: false,
  archivedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  userId: 'user1',
}

const bgColor = '#3b82f6'
const ringBgColor = 'rgba(255,255,255,0.2)'

const meta = {
  title: 'Streak/HabitCircleItem',
  component: HabitCircleItem,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'habit',
      values: [{ name: 'habit', value: bgColor }],
    },
  },
  tags: ['autodocs'],
  args: {
    habit: mockHabit,
    isCompleted: false,
    bgColor,
    ringBgColor,
    onCheckin: () => undefined,
    onContextMenu: () => undefined,
    onLongPressStart: () => undefined,
    onLongPressEnd: () => undefined,
  },
} satisfies Meta<typeof HabitCircleItem>

export default meta
type Story = StoryObj<typeof meta>

export const Incomplete: Story = {}

export const Completed: Story = {
  args: {
    isCompleted: true,
    habit: { ...mockHabit, currentProgress: 1, completionRate: 100 },
  },
}

export const WithFrequency: Story = {
  args: {
    habit: { ...mockHabit, name: '水を飲む', icon: 'droplets', frequency: 3, currentProgress: 1 },
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
