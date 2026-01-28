import type { Meta, StoryObj } from '@storybook/react'
import { storybookToast } from '@/lib/storybook'
import type { HabitWithProgress } from '@/types/habit'
import { DesktopDashboard } from './DesktopDashboard'

const meta = {
  title: 'Streak/DesktopDashboard',
  component: DesktopDashboard,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-background">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DesktopDashboard>

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

const habits = [
  createHabit(),
  createHabit({
    id: 'habit-2',
    name: '30分運動',
    icon: 'dumbbell',
    color: 'orange',
    frequency: 1,
    currentProgress: 1,
    completionRate: 100,
    streak: 7,
  }),
  createHabit({
    id: 'habit-3',
    name: '読書',
    icon: 'book-open',
    color: 'purple',
    frequency: 1,
    currentProgress: 0,
    completionRate: 0,
    streak: 5,
  }),
]

const user = {
  id: 'user-1',
  clerkId: 'clerk-1',
  email: 'demo@example.com',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-28'),
}

export const Default: Story = {
  args: {
    habits,
    user,
    onAddHabit: (name, icon, options) => {
      storybookToast.success('習慣を追加', `${name} (${icon})`)
      if (options?.period) {
        storybookToast.info('設定', `${options.period} / ${options.frequency ?? 1}回`)
      }
      return Promise.resolve()
    },
    onToggleCheckin: (habitId) => {
      storybookToast.info('チェックイン切り替え', `habitId: ${habitId}`)
      return Promise.resolve()
    },
  },
}

export const Empty: Story = {
  args: {
    habits: [],
    user,
    onAddHabit: (name) => {
      storybookToast.success('習慣を追加', name)
      return Promise.resolve()
    },
    onToggleCheckin: () => Promise.resolve(),
  },
}
