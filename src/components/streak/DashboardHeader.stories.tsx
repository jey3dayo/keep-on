import type { Meta, StoryObj } from '@storybook/react'
import { DashboardHeader } from './DashboardHeader'

const meta = {
  title: 'Streak/DashboardHeader',
  component: DashboardHeader,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DashboardHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Mobile: Story = {
  args: {
    variant: 'mobile',
    todayCompleted: 5,
    totalDaily: 8,
    totalStreak: 12,
  },
}

export const Desktop: Story = {
  args: {
    variant: 'desktop',
    todayCompleted: 5,
    totalDaily: 8,
    totalStreak: 12,
    onAddClick: () => {
      alert('追加ボタンがクリックされました')
    },
  },
}

export const DesktopCompleted: Story = {
  args: {
    variant: 'desktop',
    todayCompleted: 8,
    totalDaily: 8,
    totalStreak: 30,
    onAddClick: () => {
      alert('追加ボタンがクリックされました')
    },
  },
}

export const MobileZero: Story = {
  args: {
    variant: 'mobile',
    todayCompleted: 0,
    totalDaily: 5,
    totalStreak: 0,
  },
}
