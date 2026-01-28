import type { Meta, StoryObj } from '@storybook/react'
import { storybookToast } from '@/lib/storybook'
import type { HabitWithProgress } from '@/types/habit'
import { HabitListView } from './HabitListView'

const meta = {
  title: 'Streak/HabitListView',
  component: HabitListView,
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
} satisfies Meta<typeof HabitListView>

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
    id: 'habit-5',
    name: '月の振り返り',
    icon: 'clock',
    color: 'pink',
    period: 'monthly',
    frequency: 1,
    currentProgress: 0,
    completionRate: 0,
    streak: 2,
  }),
]

const completedHabitIds = new Set(habits.filter((habit) => habit.currentProgress >= habit.frequency).map((h) => h.id))

export const Default: Story = {
  args: {
    habits,
    filteredHabits: habits,
    completedHabitIds,
    periodFilter: 'all',
    onPeriodChange: (filter) => {
      storybookToast.info('フィルター変更', `filter: ${filter}`)
    },
    onToggleHabit: (habitId) => {
      storybookToast.info('チェックイン切り替え', `habitId: ${habitId}`)
    },
    onAddHabit: () => {
      storybookToast.success('習慣を追加', 'Storybookでのデモです')
    },
    todayCompleted: 1,
    totalDaily: 3,
    totalStreak: 30,
  },
}

export const Empty: Story = {
  args: {
    habits: [],
    filteredHabits: [],
    completedHabitIds: new Set(),
    periodFilter: 'all',
    onPeriodChange: () => undefined,
    onToggleHabit: () => undefined,
    onAddHabit: () => {
      storybookToast.success('習慣を追加', 'Storybookでのデモです')
    },
    todayCompleted: 0,
    totalDaily: 0,
    totalStreak: 0,
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
