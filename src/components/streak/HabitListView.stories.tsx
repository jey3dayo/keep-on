import type { Meta, StoryObj } from '@storybook/react'
import { storybookToast } from '@/lib/storybook'
import type { HabitWithProgress } from '@/types/habit'
import { HabitListView } from './HabitListView'

const meta = {
  component: HabitListView,
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
  title: 'Streak/HabitListView',
} satisfies Meta<typeof HabitListView>

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
    color: 'blue',
    completionRate: 0,
    currentProgress: 0,
    frequency: 1,
    icon: 'target',
    id: 'habit-4',
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
    id: 'habit-5',
    name: '月の振り返り',
    period: 'monthly',
    streak: 2,
  }),
]

const completedHabitIds = new Set(habits.filter((habit) => habit.currentProgress >= habit.frequency).map((h) => h.id))

export const Default: Story = {
  args: {
    completedHabitIds,
    filteredHabits: habits,
    habits,
    onAddHabit: () => {
      storybookToast.success('習慣を追加', 'Storybookでのデモです')
    },
    onPeriodChange: (filter) => {
      storybookToast.info('フィルター変更', `filter: ${filter}`)
    },
    onToggleHabit: (habitId) => {
      storybookToast.info('チェックイン切り替え', `habitId: ${habitId}`)
    },
    periodFilter: 'all',
    todayActive: 1,
    todayLabel: '1月29日（木）',
    totalDaily: 3,
    totalStreak: 30,
  },
}

export const Empty: Story = {
  args: {
    completedHabitIds: new Set(),
    filteredHabits: [],
    habits: [],
    onAddHabit: () => {
      storybookToast.success('習慣を追加', 'Storybookでのデモです')
    },
    onPeriodChange: () => undefined,
    onToggleHabit: () => undefined,
    periodFilter: 'all',
    todayActive: 0,
    todayLabel: '1月29日（木）',
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
