import type { Meta, StoryObj } from '@storybook/react'
import { storybookToast } from '@/lib/storybook'
import type { HabitWithProgress } from '@/types/habit'
import { HabitEditModal } from './HabitEditModal'

const meta = {
  title: 'Streak/HabitEditModal',
  component: HabitEditModal,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof HabitEditModal>

export default meta
type Story = StoryObj<typeof meta>

const habit: HabitWithProgress = {
  id: 'habit-1',
  name: '水を8杯飲む',
  icon: 'droplets',
  color: 'cyan',
  period: 'daily',
  frequency: 8,
  currentProgress: 5,
  streak: 12,
  completionRate: 62,
  archived: false,
  archivedAt: null,
  userId: 'user-1',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-28'),
}

export const Default: Story = {
  args: {
    habit,
    onClose: () => {
      storybookToast.info('閉じる', 'モーダルを閉じました')
    },
    onSave: (updatedHabit) => {
      storybookToast.success('保存', JSON.stringify(updatedHabit))
    },
    onDelete: (habitId) => {
      storybookToast.error('削除', `habitId: ${habitId}`)
    },
  },
}
