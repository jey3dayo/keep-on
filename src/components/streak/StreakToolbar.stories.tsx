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

    const decorators = [
      ...(meta.decorators ?? []),
      ...(story.decorators ?? []),
    ] as Array<(Story: () => JSX.Element | null) => JSX.Element | null>

    const DecoratedStory = decorators.reduce(
      (Decorated, decorator) => () => decorator(Decorated),
      StoryComponent,
    )

    return render(<DecoratedStory />)
  }

  describe(`${meta.title} Stories`, () => {
    it('Interactiveがレンダリングされる', () => {
      const { container } = renderStory(Interactive)
      expect(container).not.toBeEmptyDOMElement()
    })
  })
}
