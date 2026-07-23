import type { Meta, StoryObj } from '@storybook/react'
import { storybookToast } from '@/lib/storybook'
import type { HabitWithProgress } from '@/types/habit'
import { HabitCard } from './HabitCard'

const meta = {
  component: HabitCard,
  decorators: [
    (Story) => (
      <div className="w-[320px]">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Streak/HabitCard',
} satisfies Meta<typeof HabitCard>

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

const baseHabit = createHabit()

export const Incomplete: Story = {
  args: {
    completed: false,
    habit: baseHabit,
    onToggle: () => {
      storybookToast.info('チェックイン', baseHabit.name)
    },
  },
}

export const Completed: Story = {
  args: {
    completed: true,
    habit: createHabit({
      completionRate: 100,
      currentProgress: 8,
      streak: 30,
    }),
    onToggle: () => {
      storybookToast.info('チェックイン', '完了済みを切り替えました')
    },
  },
}

export const WithMenu: Story = {
  args: {
    completed: false,
    habit: baseHabit,
    onDelete: () => {
      storybookToast.error('削除', '削除ボタンがクリックされました')
    },
    onEdit: () => {
      storybookToast.success('編集', '編集ボタンがクリックされました')
    },
    onToggle: () => {
      storybookToast.info('チェックイン', baseHabit.name)
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
    it('Incompleteがレンダリングされる', () => {
      const { container } = renderStory(Incomplete)
      expect(container).not.toBeEmptyDOMElement()
    })
  })
}
