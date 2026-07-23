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
]

const user = {
  clerkId: 'clerk-1',
  createdAt: new Date('2025-01-01'),
  email: 'demo@example.com',
  id: 'user-1',
  updatedAt: new Date('2025-01-28'),
}

export const Default: Story = {
  args: {
    habits,
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
    todayLabel: '1月29日（木）',
    user,
  },
}

export const Empty: Story = {
  args: {
    habits: [],
    onAddHabit: (name) => {
      storybookToast.success('習慣を追加', name)
      return Promise.resolve()
    },
    onToggleCheckin: () => Promise.resolve(),
    todayLabel: '1月29日（木）',
    user,
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
