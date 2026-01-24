import type { Meta, StoryObj } from '@storybook/react'
import { ThemeProvider } from './ThemeProvider'
import { ThemeToggle } from './ThemeToggle'

const meta = {
  title: 'Components/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof ThemeToggle>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithDescription: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-4">
      <ThemeToggle />
      <p className="text-sm text-muted-foreground">Click to toggle theme</p>
    </div>
  ),
}

export const InHeader: Story = {
  render: () => (
    <header className="flex items-center justify-between rounded-lg border bg-card p-4">
      <h1 className="text-xl font-bold">KeepOn</h1>
      <ThemeToggle />
    </header>
  ),
}

export const Multiple: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <ThemeToggle />
      <ThemeToggle />
      <ThemeToggle />
    </div>
  ),
}
