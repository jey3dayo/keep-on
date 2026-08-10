import type { Meta, StoryObj } from '@storybook/react'
import { storybookToast } from '@/lib/storybook'
import { HabitPresetSelector } from './HabitPresetSelector'

const meta = {
  component: HabitPresetSelector,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  title: 'Streak/HabitPresetSelector',
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
  const { renderStory } = await import('@/lib/storybook')

  describe(`${meta.title} Stories`, () => {
    it('Defaultがレンダリングされる', () => {
      const { container } = renderStory(Default, meta)
      expect(container).not.toBeEmptyDOMElement()
    })
  })
}
