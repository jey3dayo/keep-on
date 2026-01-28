import type { Meta, StoryObj } from '@storybook/react'
import { storybookToast } from '@/lib/storybook'
import { HabitPresetSelector } from './HabitPresetSelector'

const meta = {
  title: 'Streak/HabitPresetSelector',
  component: HabitPresetSelector,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof HabitPresetSelector>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onClose: () => {
      storybookToast.info('閉じる', 'クローズボタンがクリックされました')
    },
    onCreateCustom: () => {
      storybookToast.success('カスタム作成', 'カスタム作成を選択しました')
    },
    onSelectPreset: (preset) => {
      storybookToast.success('プリセット選択', preset.name)
    },
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
    it('Defaultがレンダリングされる', () => {
      const { container } = renderStory(Default)
      expect(container).not.toBeEmptyDOMElement()
    })
  })
}
