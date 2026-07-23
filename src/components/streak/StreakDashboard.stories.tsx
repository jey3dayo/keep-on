import type { Meta, StoryObj } from '@storybook/react'
import { storybookToast } from '@/lib/storybook'
import type { HabitWithProgress } from '@/types/habit'
import { StreakDashboard } from './StreakDashboard'

const meta = {
  component: StreakDashboard,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  title: 'Streak/StreakDashboard',
} satisfies Meta<typeof StreakDashboard>

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

export const DashboardView: Story = {
  args: {
    habits,
    initialView: 'dashboard',
    onAddHabit: (name) => {
      storybookToast.success('習慣を追加', name)
      return Promise.resolve()
    },
    onToggleCheckin: (habitId) => {
      storybookToast.info('チェックイン切り替え', `habitId: ${habitId}`)
      return Promise.resolve()
    },
    todayLabel: '1月29日（木）',
  },
}

export const SimpleView: Story = {
  args: {
    habits,
    initialView: 'simple',
    onAddHabit: (name) => {
      storybookToast.success('習慣を追加', name)
      return Promise.resolve()
    },
    onToggleCheckin: (habitId) => {
      storybookToast.info('チェックイン切り替え', `habitId: ${habitId}`)
      return Promise.resolve()
    },
    todayLabel: '1月29日（木）',
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
