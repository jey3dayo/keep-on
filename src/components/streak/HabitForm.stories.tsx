import type { Meta, StoryObj } from '@storybook/react'
import type { IconName } from '@/components/basics/Icon'
import type { Period } from '@/constants/habit'
import { habitPresets } from '@/constants/habit-data'
import { storybookToast } from '@/lib/storybook'
import { HabitForm } from './HabitForm'

const meta = {
  title: 'Streak/HabitForm',
  component: HabitForm,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof HabitForm>

export default meta
type Story = StoryObj<typeof meta>

const handleSubmit = async (input: {
  name: string
  icon: IconName
  color: string
  period: Period
  frequency: number
}) => {
  await new Promise((resolve) => setTimeout(resolve, 400))
  storybookToast.success('保存しました', `${input.name} を追加しました`)
}

export const Default: Story = {
  args: {
    onBack: () => {
      storybookToast.info('戻る', '戻るボタンがクリックされました')
    },
    onSubmit: handleSubmit,
  },
}

export const WithPreset: Story = {
  args: {
    onBack: () => {
      storybookToast.info('戻る', '戻るボタンがクリックされました')
    },
    onSubmit: handleSubmit,
    preset: habitPresets[0],
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
    it('Defaultがレンダリングされる', () => {
      const { container } = renderStory(Default)
      expect(container).not.toBeEmptyDOMElement()
    })
  })
}
