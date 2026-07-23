import type { Meta, StoryObj } from '@storybook/react'
import { storybookToast } from '@/lib/storybook'
import type { HabitWithProgress } from '@/types/habit'
import { TaskGrid } from './TaskGrid'

const meta = {
  component: TaskGrid,
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-slate-950 text-white">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  title: 'Streak/TaskGrid',
} satisfies Meta<typeof TaskGrid>

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
]

const completedHabitIds = new Set(habits.filter((habit) => habit.currentProgress >= habit.frequency).map((h) => h.id))

export const Default: Story = {
  args: {
    completedHabitIds,
    habits,
    onAddClick: () => {
      storybookToast.success('タスクを追加', 'Storybookでのデモです')
    },
    onToggleHabit: (habitId) => {
      storybookToast.info('チェックイン切り替え', `habitId: ${habitId}`)
    },
  },
}

export const WithFewHabits: Story = {
  args: {
    completedHabitIds: new Set([habits[1]?.id].filter(Boolean)),
    habits: habits.slice(0, 2),
    onAddClick: () => {
      storybookToast.success('タスクを追加', 'Storybookでのデモです')
    },
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
