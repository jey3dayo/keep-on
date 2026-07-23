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
    onAddHabit: () => {
      storybookToast.success('タスクを追加', 'Storybookでのデモです')
    },
    onSettings: () => {
      storybookToast.info('設定', '設定ボタンがクリックされました')
    },
    onToggleHabit: (habitId) => {
      storybookToast.info('チェックイン切り替え', `habitId: ${habitId}`)
    },
  },
}

export const CustomBackground: Story = {
  args: {
    backgroundColor: 'var(--blue-9)',
    completedHabitIds: new Set([habits[1]?.id, habits[3]?.id].filter(Boolean)),
    habits: habits.slice(0, 4),
    onAddHabit: () => {
      storybookToast.success('タスクを追加', 'Storybookでのデモです')
    },
    onSettings: () => undefined,
    onToggleHabit: (habitId) => {
      storybookToast.info('チェックイン切り替え', `habitId: ${habitId}`)
    },
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

    const decorators = [...(meta.decorators ?? []), ...(story.decorators ?? [])] as Array<
      (Story: () => JSX.Element | null) => JSX.Element | null
    >

    const DecoratedStory = decorators.reduce((Decorated, decorator) => () => decorator(Decorated), StoryComponent)

    return render(<DecoratedStory />)
  }

  describe(`${meta.title} Stories`, () => {
    it('Defaultがレンダリングされる', () => {
      const { container } = renderStory(Default)
      expect(container).not.toBeEmptyDOMElement()
    })
  })
}
