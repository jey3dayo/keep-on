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
    it('Interactiveがレンダリングされる', () => {
      const { container } = renderStory(Interactive)
      expect(container).not.toBeEmptyDOMElement()
    })
  })
}
