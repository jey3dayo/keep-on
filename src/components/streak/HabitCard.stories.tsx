import type { Meta, StoryObj } from '@storybook/react'
import { storybookToast } from '@/lib/storybook'
import type { HabitWithProgress } from '@/types/habit'
import { HabitCard } from './HabitCard'

const meta = {
  title: 'Streak/HabitCard',
  component: HabitCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[320px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HabitCard>

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

const baseHabit = createHabit()

export const Incomplete: Story = {
  args: {
    habit: baseHabit,
    completed: false,
    onToggle: () => {
      storybookToast.info('チェックイン', baseHabit.name)
    },
  },
}

export const Completed: Story = {
  args: {
    habit: createHabit({
      currentProgress: 8,
      completionRate: 100,
      streak: 30,
    }),
    completed: true,
    onToggle: () => {
      storybookToast.info('チェックイン', '完了済みを切り替えました')
    },
  },
}

export const WithMenu: Story = {
  args: {
    habit: baseHabit,
    completed: false,
    onToggle: () => {
      storybookToast.info('チェックイン', baseHabit.name)
    },
    onEdit: () => {
      storybookToast.success('編集', '編集ボタンがクリックされました')
    },
    onDelete: () => {
      storybookToast.error('削除', '削除ボタンがクリックされました')
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
    it('Incompleteがレンダリングされる', () => {
      const { container } = renderStory(Incomplete)
      expect(container).not.toBeEmptyDOMElement()
    })
  })
}
