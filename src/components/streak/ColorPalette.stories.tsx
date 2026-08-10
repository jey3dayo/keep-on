import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { COLOR_THEMES, type ColorThemeName } from '@/constants/theme'
import { ColorPalette } from './ColorPalette'

const meta = {
  argTypes: {
    currentTheme: {
      control: 'select',
      options: COLOR_THEMES,
    },
  },
  component: ColorPalette,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Streak/ColorPalette',
} satisfies Meta<typeof ColorPalette>

export default meta
type Story = StoryObj<typeof meta>

function InteractiveStory() {
  const [theme, setTheme] = useState<ColorThemeName>('lime')
  return <ColorPalette currentTheme={theme} onThemeChange={setTheme} />
}

export const Interactive: Story = {
  args: {
    currentTheme: 'lime',
    onThemeChange: () => {
      // Interactive のプレビューは InteractiveStory 内の useState が状態を持つため no-op。
    },
  },
  render: () => <InteractiveStory />,
}

export const Selected: Story = {
  args: {
    currentTheme: 'blue',
    onThemeChange: () => undefined,
  },
}

if (import.meta.vitest) {
  const { describe, expect, it } = await import('vitest')
  const { renderStory } = await import('@/lib/storybook')

  describe(`${meta.title} Stories`, () => {
    it('Interactiveがレンダリングされる', () => {
      const { container } = renderStory(Interactive, meta)
      expect(container).not.toBeEmptyDOMElement()
    })
  })
}
