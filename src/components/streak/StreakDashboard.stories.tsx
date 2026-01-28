import type { Meta, StoryObj } from '@storybook/react'
import { storybookToast } from '@/lib/storybook'
import type { HabitWithProgress } from '@/types/habit'
import { StreakDashboard } from './StreakDashboard'

const meta = {
  title: 'Streak/StreakDashboard',
  component: StreakDashboard,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof StreakDashboard>

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
]

export const DashboardView: Story = {
  args: {
    habits,
    onAddHabit: (name) => {
      storybookToast.success('習慣を追加', name)
      return Promise.resolve()
    },
    onToggleCheckin: (habitId) => {
      storybookToast.info('チェックイン切り替え', `habitId: ${habitId}`)
      return Promise.resolve()
    },
    initialView: 'dashboard',
  },
}

export const SimpleView: Story = {
  args: {
    habits,
    onAddHabit: (name) => {
      storybookToast.success('習慣を追加', name)
      return Promise.resolve()
    },
    onToggleCheckin: (habitId) => {
      storybookToast.info('チェックイン切り替え', `habitId: ${habitId}`)
      return Promise.resolve()
    },
    initialView: 'simple',
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
    it('DashboardViewがレンダリングされる', () => {
      const { container } = renderStory(DashboardView)
      expect(container).not.toBeEmptyDOMElement()
    })
  })
}
