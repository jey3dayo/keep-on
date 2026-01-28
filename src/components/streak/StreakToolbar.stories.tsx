import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import type { ColorThemeName } from '@/constants/theme'
import { StreakToolbar } from './StreakToolbar'

const meta = {
  title: 'Streak/StreakToolbar',
  component: StreakToolbar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="min-h-[220px] bg-slate-950">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StreakToolbar>

export default meta
type Story = StoryObj<typeof meta>

export const Interactive: Story = {
  render: () => {
    const [theme, setTheme] = useState<ColorThemeName>('lime')
    return <StreakToolbar currentTheme={theme} onThemeChange={setTheme} ready />
  },
}

export const Loading: Story = {
  args: {
    currentTheme: 'lime',
    onThemeChange: () => undefined,
    ready: false,
  },
}
