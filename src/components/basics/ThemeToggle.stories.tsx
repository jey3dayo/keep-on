import type { Meta, StoryObj } from '@storybook/react'
import type { ComponentType } from 'react'
import { ThemeProvider } from '@/components/basics/ThemeProvider'
import { ThemeToggle } from './ThemeToggle'

const meta = {
  component: ThemeToggle,
  decorators: [
    (Story: ComponentType) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Basics/ThemeToggle',
} satisfies Meta<typeof ThemeToggle>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithDescription: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-4">
      <ThemeToggle />
      <p className="text-muted-foreground text-sm">Click to toggle theme</p>
    </div>
  ),
}

export const InHeader: Story = {
  render: () => (
    <header className="flex items-center justify-between rounded-lg border bg-card p-4">
      <h1 className="font-bold text-xl">KeepOn</h1>
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

if (import.meta.vitest) {
  const { describe, expect, it } = await import('vitest')
  const { renderStory } = await import('@/lib/storybook')

  describe(`${meta.title} Stories`, () => {
    it('Defaultがレンダリングされる', () => {
      const { container } = renderStory(Default, meta)
      expect(container).not.toBeEmptyDOMElement()
    })
  })
}
