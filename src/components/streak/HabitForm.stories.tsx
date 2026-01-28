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
