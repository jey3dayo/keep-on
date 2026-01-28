import type { Meta, StoryObj } from '@storybook/react'
import type { ComponentType } from 'react'
import { ThemeProvider } from '@/components/basics/ThemeProvider'
import { Appbar } from './Appbar'

const meta = {
  title: 'Dashboard/Appbar',
  component: Appbar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story: ComponentType) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof Appbar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithUserButton: Story = {
  args: {
    showUserButton: true,
  },
  render: (args) => (
    <div>
      <Appbar {...args} />
      <div className="p-8">
        <h1 className="mb-4 font-bold text-3xl">Dashboard</h1>
        <p className="text-muted-foreground">This story shows the Appbar with user authentication enabled.</p>
        <p className="mt-2 text-muted-foreground text-sm">
          Note: UserButton requires Clerk authentication context to render properly.
        </p>
      </div>
    </div>
  ),
}

export const WithContent: Story = {
  render: () => (
    <div className="min-h-screen bg-background">
      <Appbar />
      <main className="container mx-auto p-8">
        <h1 className="mb-4 font-bold text-3xl">Welcome to KeepOn</h1>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            This is an example page showing how the Appbar integrates with content.
          </p>
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-2 font-semibold text-xl">Card Title</h2>
            <p className="text-muted-foreground text-sm">
              This card demonstrates the visual hierarchy with the new design system.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-2 font-semibold text-xl">Another Card</h2>
            <p className="text-muted-foreground text-sm">
              Notice the subtle difference between the card background and page background.
            </p>
          </div>
        </div>
      </main>
    </div>
  ),
}

export const MobileView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  render: () => (
    <div className="min-h-screen bg-background">
      <Appbar showUserButton />
      <main className="p-4">
        <h1 className="mb-4 font-bold text-2xl">Mobile View</h1>
        <p className="text-muted-foreground text-sm">
          On mobile, navigation links are hidden and accessible via the menu button.
        </p>
      </main>
    </div>
  ),
}
