import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { COLOR_THEMES, type ColorThemeName } from '@/constants/theme'
import { ColorPalette } from './ColorPalette'

const meta = {
  title: 'Streak/ColorPalette',
  component: ColorPalette,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    currentTheme: {
      control: 'select',
      options: COLOR_THEMES,
    },
  },
} satisfies Meta<typeof ColorPalette>

export default meta
type Story = StoryObj<typeof meta>

export const Interactive: Story = {
  render: () => {
    const [theme, setTheme] = useState<ColorThemeName>('lime')
    return <ColorPalette currentTheme={theme} onThemeChange={setTheme} />
  },
}

export const Selected: Story = {
  args: {
    currentTheme: 'blue',
    onThemeChange: () => undefined,
  },
}
