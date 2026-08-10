import type { Meta, StoryObj } from '@storybook/react'
import { DashboardStatsCard } from './DashboardStatsCard'

const meta = {
  component: DashboardStatsCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Dashboard/DashboardStatsCard',
} satisfies Meta<typeof DashboardStatsCard>

export default meta
type Story = StoryObj<typeof meta>

export const Progress: Story = {
  args: {
    total: 8,
    type: 'progress',
    value: 5,
  },
}

export const ProgressCompleted: Story = {
  args: {
    total: 8,
    type: 'progress',
    value: 8,
  },
}

export const ProgressZero: Story = {
  args: {
    total: 5,
    type: 'progress',
    value: 0,
  },
}

export const Streak: Story = {
  args: {
    suffix: '日',
    type: 'streak',
    value: 12,
  },
}

export const StreakLong: Story = {
  args: {
    suffix: '日',
    type: 'streak',
    value: 100,
  },
}

export const StreakZero: Story = {
  args: {
    suffix: '日',
    type: 'streak',
    value: 0,
  },
}

if (import.meta.vitest) {
  const { describe, expect, it } = await import('vitest')
  const { renderStory } = await import('@/lib/storybook')

  describe(`${meta.title} Stories`, () => {
    it('Progressがレンダリングされる', () => {
      const { container } = renderStory(Progress, meta)
      expect(container).not.toBeEmptyDOMElement()
    })
  })
}
