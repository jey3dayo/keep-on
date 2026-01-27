import type { Meta, StoryObj } from '@storybook/react'
import { HabitActionDrawer } from './HabitActionDrawer'

const meta = {
  title: 'Components/Streak/HabitActionDrawer',
  component: HabitActionDrawer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Drawerの開閉状態',
    },
    habit: {
      description: '操作対象の習慣データ',
    },
    onOpenChange: {
      description: '開閉状態が変化したときのコールバック',
    },
  },
} satisfies Meta<typeof HabitActionDrawer>

export default meta
type Story = StoryObj<typeof meta>

// モック習慣データ
const mockHabit = {
  id: '1',
  name: '毎日水を8杯飲む',
  icon: 'droplets' as const,
  color: 'blue',
  period: 'daily' as const,
  frequency: 8,
  currentProgress: 3,
  streak: 5,
  completionRate: 37,
  archived: false,
  archivedAt: null,
  userId: 'user1',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-28'),
}

export const Default: Story = {
  args: {
    open: true,
    habit: mockHabit,
    onOpenChange: (open) => console.log('Drawer opened:', open),
  },
}

export const WeeklyHabit: Story = {
  args: {
    open: true,
    habit: {
      ...mockHabit,
      id: '2',
      name: '週3回ジョギング',
      icon: 'activity',
      color: 'green',
      period: 'weekly' as const,
      frequency: 3,
      currentProgress: 1,
      streak: 12,
      completionRate: 33,
    },
    onOpenChange: (open) => console.log('Drawer opened:', open),
  },
}

export const MonthlyHabit: Story = {
  args: {
    open: true,
    habit: {
      ...mockHabit,
      id: '3',
      name: '月10回読書',
      icon: 'book',
      color: 'purple',
      period: 'monthly' as const,
      frequency: 10,
      currentProgress: 7,
      streak: 3,
      completionRate: 70,
    },
    onOpenChange: (open) => console.log('Drawer opened:', open),
  },
}

export const Completed: Story = {
  args: {
    open: true,
    habit: {
      ...mockHabit,
      id: '4',
      name: '完了した習慣',
      currentProgress: 8,
      streak: 30,
      completionRate: 100,
    },
    onOpenChange: (open) => console.log('Drawer opened:', open),
  },
}

export const Closed: Story = {
  args: {
    open: false,
    habit: mockHabit,
    onOpenChange: (open) => console.log('Drawer opened:', open),
  },
}
