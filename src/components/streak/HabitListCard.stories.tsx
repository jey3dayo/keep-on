import type { Meta, StoryObj } from '@storybook/react'
import { storybookToast } from '@/lib/storybook'
import type { HabitWithProgress } from '@/types/habit'
import { HabitListCard } from './HabitListCard'

const meta = {
  component: HabitListCard,
  decorators: [
    (Story) => (
      <div className="w-[360px] bg-background p-6">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Streak/HabitListCard',
} satisfies Meta<typeof HabitListCard>

export default meta
type Story = StoryObj<typeof meta>

const createHabit = (overrides: Partial<HabitWithProgress> = {}): HabitWithProgress => ({
  archived: false,
  archivedAt: null,
  color: 'cyan',
  completionRate: 62,
  createdAt: new Date('2025-01-01'),
  currentProgress: 5,
  frequency: 8,
  icon: 'droplets',
  id: 'habit-1',
  name: '水を8杯飲む',
  period: 'daily',
  streak: 12,
  updatedAt: new Date('2025-01-28'),
  userId: 'user-1',
  ...overrides,
})

export const Default: Story = {
  args: {
    completed: false,
    dimmed: false,
    habit: createHabit(),
    onLongPressOrContextMenu: () => storybookToast.info('長押し', 'アクションを開く'),
    onToggle: () => storybookToast.info('チェックイン切り替え', 'habit-1'),
    pending: false,
  },
}

export const Completed: Story = {
  args: {
    completed: true,
    dimmed: true,
    habit: createHabit({ completionRate: 100, currentProgress: 1, frequency: 1 }),
    onLongPressOrContextMenu: () => storybookToast.info('長押し', 'アクションを開く'),
    onToggle: () => storybookToast.info('チェックイン切り替え', 'habit-1'),
    pending: false,
  },
}

export const Pending: Story = {
  args: {
    completed: false,
    dimmed: false,
    habit: createHabit({ completionRate: 37, currentProgress: 3 }),
    onLongPressOrContextMenu: () => storybookToast.info('長押し', 'アクションを開く'),
    onToggle: () => storybookToast.info('チェックイン切り替え', 'habit-1'),
    pending: true,
  },
}
