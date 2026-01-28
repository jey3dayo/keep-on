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
