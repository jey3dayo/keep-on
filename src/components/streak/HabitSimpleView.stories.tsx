import type { Meta, StoryObj } from '@storybook/react'
import { storybookToast } from '@/lib/storybook'
import type { HabitWithProgress } from '@/types/habit'
import { HabitSimpleView } from './HabitSimpleView'

const meta = {
  title: 'Streak/HabitSimpleView',
  component: HabitSimpleView,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof HabitSimpleView>

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
  createHabit({
    id: 'habit-4',
    name: '瞑想する',
    icon: 'brain',
    color: 'teal',
    frequency: 1,
    currentProgress: 1,
    completionRate: 100,
    streak: 18,
  }),
  createHabit({
    id: 'habit-5',
    name: '週次レビュー',
    icon: 'target',
    color: 'blue',
    period: 'weekly',
    frequency: 1,
    currentProgress: 0,
    completionRate: 0,
    streak: 4,
  }),
  createHabit({
    id: 'habit-6',
    name: '月の振り返り',
    icon: 'clock',
    color: 'pink',
    period: 'monthly',
    frequency: 1,
    currentProgress: 0,
    completionRate: 0,
    streak: 2,
  }),
  createHabit({
    id: 'habit-7',
    name: '日記を書く',
    icon: 'palette',
    color: 'lime',
    frequency: 1,
    currentProgress: 1,
    completionRate: 100,
    streak: 3,
  }),
]

const completedHabitIds = new Set(habits.filter((habit) => habit.currentProgress >= habit.frequency).map((h) => h.id))

export const Default: Story = {
  args: {
    habits,
    completedHabitIds,
    onToggleHabit: (habitId) => {
      storybookToast.info('チェックイン切り替え', `habitId: ${habitId}`)
    },
    onAddHabit: () => {
      storybookToast.success('タスクを追加', 'Storybookでのデモです')
    },
    onSettings: () => {
      storybookToast.info('設定', '設定ボタンがクリックされました')
    },
  },
}

export const CustomBackground: Story = {
  args: {
    habits: habits.slice(0, 4),
    completedHabitIds: new Set([habits[1]?.id, habits[3]?.id].filter(Boolean)),
    onToggleHabit: (habitId) => {
      storybookToast.info('チェックイン切り替え', `habitId: ${habitId}`)
    },
    onAddHabit: () => {
      storybookToast.success('タスクを追加', 'Storybookでのデモです')
    },
    onSettings: () => undefined,
    backgroundColor: 'oklch(0.62 0.18 250)',
  },
}

if (import.meta.vitest) {
  const { describe, expect, it } = await import('vitest')
  const { render } = await import('@testing-library/react')

  const renderStory = (story: Story) => {
    const args = { ...(meta.args ?? {}), ...(story.args ?? {}) }
    const StoryComponent = () => {
      if (story.render) {
        return story.render(args) as JSX.Element | null
      }

      const Component = meta.component

      if (!Component) {
        throw new Error('meta.component is not defined')
      }

      return <Component {...args} />
    }

    const decorators = [
      ...(meta.decorators ?? []),
      ...(story.decorators ?? []),
    ] as Array<(Story: () => JSX.Element | null) => JSX.Element | null>

    const DecoratedStory = decorators.reduce(
      (Decorated, decorator) => () => decorator(Decorated),
      StoryComponent,
    )

    return render(<DecoratedStory />)
  }

  describe(`${meta.title} Stories`, () => {
    it('Defaultがレンダリングされる', () => {
      const { container } = renderStory(Default)
      expect(container).not.toBeEmptyDOMElement()
    })
  })
}
