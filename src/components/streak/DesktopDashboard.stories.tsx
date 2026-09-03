import type { Meta, StoryObj } from '@storybook/react'
import { storybookToast } from '@/lib/storybook'
import type { HabitWithProgress } from '@/types/habit'
import { DesktopDashboard } from './DesktopDashboard'

const meta = {
  component: DesktopDashboard,
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-background">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  title: 'Streak/DesktopDashboard',
} satisfies Meta<typeof DesktopDashboard>

export default meta
type Story = StoryObj<typeof meta>

const createHabit = (overrides: Partial<HabitWithProgress> = {}): HabitWithProgress => ({
  archived: false,
  archivedAt: null,
  color: 'cyan',
  completionRate: 62,
  createdAt: new Date('2025-01-01').toISOString(),
  currentProgress: 5,
  frequency: 8,
  icon: 'droplets',
  id: 'habit-1',
  name: '水を8杯飲む',
  period: 'daily',
  reminderTime: null,
  skippedToday: false,
  streak: 12,
  updatedAt: new Date('2025-01-28').toISOString(),
  userId: 'user-1',
  ...overrides,
})

const habits = [
  createHabit(),
  createHabit({
    color: 'orange',
    completionRate: 100,
    currentProgress: 1,
    frequency: 1,
    icon: 'dumbbell',
    id: 'habit-2',
    name: '30分運動',
    streak: 7,
  }),
  createHabit({
    color: 'purple',
    completionRate: 0,
    currentProgress: 0,
    frequency: 1,
    icon: 'book-open',
    id: 'habit-3',
    name: '読書',
    streak: 5,
  }),
]

const user = {
  createdAt: new Date('2025-01-01'),
  dayStartHour: 24 as const,
  email: 'demo@example.com',
  externalId: 'access-1',
  id: 'user-1',
  updatedAt: new Date('2025-01-28'),
  weekStart: 'monday' as const,
}

export const Default: Story = {
  args: {
    habits,
    onAddCheckin: (habitId) => {
      storybookToast.info('チェックイン追加', `habitId: ${habitId}`)
      return Promise.resolve()
    },
    onRemoveCheckin: (habitId) => {
      storybookToast.info('チェックイン取り消し', `habitId: ${habitId}`)
      return Promise.resolve()
    },
    todayLabel: '1月29日（木）',
    user,
  },
}

export const Empty: Story = {
  args: {
    habits: [],
    onAddCheckin: () => Promise.resolve(),
    onRemoveCheckin: () => Promise.resolve(),
    todayLabel: '1月29日（木）',
    user,
  },
}

if (import.meta.vitest) {
  const { describe, expect, it } = await import('vitest')
  const { renderStory } = await import('@/lib/storybook')

  describe(`${meta.title} Stories`, () => {
    it('Defaultがレンダリングされる', () => {
      const { container } = renderStory(Default, meta)
      expect(container).not.toBeEmptyDOMElement()
    })
  })
}
