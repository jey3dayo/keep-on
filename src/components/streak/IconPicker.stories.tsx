import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import type { IconName } from '@/components/basics/Icon'
import { IconPicker } from './IconPicker'

const meta = {
  title: 'Streak/IconPicker',
  component: IconPicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof IconPicker>

export default meta
type Story = StoryObj<typeof meta>

export const Interactive: Story = {
  render: () => {
    const [selectedIcon, setSelectedIcon] = useState<IconName>('footprints')
    return <IconPicker onIconSelect={setSelectedIcon} selectedIcon={selectedIcon} />
  },
}

export const Selected: Story = {
  args: {
    selectedIcon: 'book-open',
    onIconSelect: () => undefined,
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
