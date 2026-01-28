import type { Meta, StoryObj } from '@storybook/react'
import { DashboardStatsCard } from './DashboardStatsCard'

const meta = {
  title: 'Dashboard/DashboardStatsCard',
  component: DashboardStatsCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DashboardStatsCard>

export default meta
type Story = StoryObj<typeof meta>

export const Progress: Story = {
  args: {
    type: 'progress',
    value: 5,
    total: 8,
  },
}

export const ProgressCompleted: Story = {
  args: {
    type: 'progress',
    value: 8,
    total: 8,
  },
}

export const ProgressZero: Story = {
  args: {
    type: 'progress',
    value: 0,
    total: 5,
  },
}

export const Streak: Story = {
  args: {
    type: 'streak',
    value: 12,
    suffix: '日',
  },
}

export const StreakLong: Story = {
  args: {
    type: 'streak',
    value: 100,
    suffix: '日',
  },
}

export const StreakZero: Story = {
  args: {
    type: 'streak',
    value: 0,
    suffix: '日',
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
    it('Progressがレンダリングされる', () => {
      const { container } = renderStory(Progress)
      expect(container).not.toBeEmptyDOMElement()
    })
  })
}
