import type { Meta, StoryObj } from '@storybook/react'
import { storybookToast } from '@/lib/storybook'
import { TaskCircle } from './TaskCircle'

const meta = {
  argTypes: {
    completed: {
      control: 'boolean',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
  component: TaskCircle,
  decorators: [
    (Story) => (
      <div className="rounded-2xl bg-slate-900 p-6">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Streak/TaskCircle',
} satisfies Meta<typeof TaskCircle>

export default meta
type Story = StoryObj<typeof meta>

const baseArgs = {
  completed: false,
  habitId: 'habit-1',
  habitName: '朝のストレッチ',
  icon: 'dumbbell',
  onToggle: (habitId: string) => {
    storybookToast.info('切り替え', `habitId: ${habitId}`)
  },
  size: 'md',
} as const

export const Default: Story = {
  args: baseArgs,
}

export const Completed: Story = {
  args: {
    ...baseArgs,
    completed: true,
  },
}

export const Small: Story = {
  args: {
    ...baseArgs,
    size: 'sm',
  },
}

export const Large: Story = {
  args: {
    ...baseArgs,
    size: 'lg',
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <TaskCircle {...baseArgs} size="sm" />
      <TaskCircle {...baseArgs} size="md" />
      <TaskCircle {...baseArgs} size="lg" />
    </div>
  ),
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
