import type { Meta, StoryObj } from '@storybook/react'
import { storybookToast } from '@/lib/storybook'
import type { HabitWithProgress } from '@/types/habit'
import { HabitListCard } from './HabitListCard'

const meta = {
  title: 'Streak/HabitListCard',
  component: HabitListCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[360px] bg-background p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HabitListCard>

export default meta
type Story = StoryObj<typeof meta>

const createHabit = (overrides: Partial<HabitWithProgress> = {}): HabitWithProgress => ({
  id: 'habit-1',
  name: '水を8杯飲む',
  icon: 'droplets',
  color: 'cyan',
  period: 'daily',
  frequency: 8,
  currentProgress: 5,
  streak: 12,
  completionRate: 62,
  archived: false,
  archivedAt: null,
  userId: 'user-1',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-28'),
  ...overrides,
})

export const Default: Story = {
  args: {
    habit: createHabit(),
    completed: false,
    dimmed: false,
    pending: false,
    onToggle: () => storybookToast.info('チェックイン切り替え', 'habit-1'),
    onLongPressOrContextMenu: () => storybookToast.info('長押し', 'アクションを開く'),
  },
}

export const Completed: Story = {
  args: {
    habit: createHabit({ frequency: 1, currentProgress: 1, completionRate: 100 }),
    completed: true,
    dimmed: true,
    pending: false,
    onToggle: () => storybookToast.info('チェックイン切り替え', 'habit-1'),
    onLongPressOrContextMenu: () => storybookToast.info('長押し', 'アクションを開く'),
  },
}

export const Pending: Story = {
  args: {
    habit: createHabit({ currentProgress: 3, completionRate: 37 }),
    completed: false,
    dimmed: false,
    pending: true,
    onToggle: () => storybookToast.info('チェックイン切り替え', 'habit-1'),
    onLongPressOrContextMenu: () => storybookToast.info('長押し', 'アクションを開く'),
  },
}
