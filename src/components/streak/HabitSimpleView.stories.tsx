import type { Meta, StoryObj } from '@storybook/react'
import { storybookToast } from '@/lib/storybook'
import type { HabitWithProgress } from '@/types/habit'
import { HabitSimpleView } from './HabitSimpleView'

const meta = {
  component: HabitSimpleView,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  title: 'Streak/HabitSimpleView',
} satisfies Meta<typeof HabitSimpleView>

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
  createHabit({
    color: 'teal',
    completionRate: 100,
    currentProgress: 1,
    frequency: 1,
    icon: 'brain',
    id: 'habit-4',
    name: '瞑想する',
    streak: 18,
  }),
  createHabit({
    color: 'blue',
    completionRate: 0,
    currentProgress: 0,
    frequency: 1,
    icon: 'target',
    id: 'habit-5',
    name: '週次レビュー',
    period: 'weekly',
    streak: 4,
  }),
  createHabit({
    color: 'pink',
    completionRate: 0,
    currentProgress: 0,
    frequency: 1,
    icon: 'clock',
    id: 'habit-6',
    name: '月の振り返り',
    period: 'monthly',
    streak: 2,
  }),
  createHabit({
    color: 'lime',
    completionRate: 100,
    currentProgress: 1,
    frequency: 1,
    icon: 'palette',
    id: 'habit-7',
    name: '日記を書く',
    streak: 3,
  }),
]

const completedHabitIds = new Set(habits.filter((habit) => habit.currentProgress >= habit.frequency).map((h) => h.id))

export const Default: Story = {
  args: {
    completedHabitIds,
    habits,
    onAddCheckin: (habitId) => {
      storybookToast.info('チェックイン追加', `habitId: ${habitId}`)
      return Promise.resolve()
    },
    onAddHabit: () => {
      storybookToast.success('タスクを追加', 'Storybookでのデモです')
    },
    onRemoveCheckin: (habitId) => {
      storybookToast.info('チェックイン取り消し', `habitId: ${habitId}`)
      return Promise.resolve()
    },
    todayActive: habits.filter((habit) => habit.period === 'daily' && habit.currentProgress > 0).length,
    totalDaily: habits.filter((habit) => habit.period === 'daily').length,
  },
}

export const CustomBackground: Story = {
  args: {
    backgroundColor: 'var(--blue-9)',
    completedHabitIds: new Set([habits[1]?.id, habits[3]?.id].filter(Boolean)),
    habits: habits.slice(0, 4),
    onAddCheckin: (habitId) => {
      storybookToast.info('チェックイン追加', `habitId: ${habitId}`)
      return Promise.resolve()
    },
    onAddHabit: () => {
      storybookToast.success('タスクを追加', 'Storybookでのデモです')
    },
    onRemoveCheckin: (habitId) => {
      storybookToast.info('チェックイン取り消し', `habitId: ${habitId}`)
      return Promise.resolve()
    },
    todayActive: habits.slice(0, 4).filter((habit) => habit.period === 'daily' && habit.currentProgress > 0).length,
    totalDaily: habits.slice(0, 4).filter((habit) => habit.period === 'daily').length,
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
