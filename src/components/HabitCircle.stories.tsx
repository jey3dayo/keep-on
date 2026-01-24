import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { expect, userEvent, within } from 'storybook/test'
import { HabitCircle } from './HabitCircle'

// Test regex patterns
const HABIT_INCOMPLETE_REGEX = /click me!を完了にする/i
const HABIT_COMPLETED_REGEX = /click me!を未完了にする/i

const meta = {
  title: 'Components/HabitCircle',
  component: HabitCircle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    completed: {
      control: 'boolean',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    emoji: {
      control: 'text',
    },
  },
} satisfies Meta<typeof HabitCircle>

export default meta
type Story = StoryObj<typeof meta>

export const Incomplete: Story = {
  args: {
    habitName: 'Morning Exercise',
    emoji: '🏃',
    completed: false,
  },
}

export const Completed: Story = {
  args: {
    habitName: 'Morning Exercise',
    emoji: '🏃',
    completed: true,
  },
}

export const Small: Story = {
  args: {
    habitName: 'Read a book',
    emoji: '📚',
    completed: false,
    size: 'sm',
  },
}

export const Medium: Story = {
  args: {
    habitName: 'Meditation',
    emoji: '🧘',
    completed: false,
    size: 'md',
  },
}

export const Large: Story = {
  args: {
    habitName: 'Workout',
    emoji: '💪',
    completed: false,
    size: 'lg',
  },
}

export const WithoutEmoji: Story = {
  args: {
    habitName: 'Daily Goal',
    emoji: null,
    completed: false,
  },
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <HabitCircle completed={false} emoji="🌱" habitName="Small habit" size="sm" />
      <HabitCircle completed={false} emoji="🌿" habitName="Medium habit" size="md" />
      <HabitCircle completed={false} emoji="🌳" habitName="Large habit" size="lg" />
    </div>
  ),
}

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <HabitCircle completed={false} emoji="🏃" habitName="Running" size="md" />
          <span className="text-muted-foreground text-sm">Incomplete</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <HabitCircle completed={true} emoji="🏃" habitName="Running" size="md" />
          <span className="text-muted-foreground text-sm">Completed</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <HabitCircle completed={false} emoji="📚" habitName="Small" size="sm" />
        <HabitCircle completed={false} emoji="🎯" habitName="Medium" size="md" />
        <HabitCircle completed={false} emoji="💪" habitName="Large" size="lg" />
      </div>
    </div>
  ),
}

export const Interactive: Story = {
  args: {
    habitName: 'Click me!',
    emoji: '🎯',
    completed: false,
  },
  render: (args) => {
    const [completed, setCompleted] = useState(args.completed)

    return <HabitCircle {...args} completed={completed} onClick={() => setCompleted(!completed)} />
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', { name: HABIT_INCOMPLETE_REGEX })

    // 初期状態: 未完了
    await expect(button).toBeInTheDocument()

    // クリックして完了状態に
    await userEvent.click(button)

    // 状態が変わったことを確認（aria-labelが変わる）
    const completedButton = canvas.getByRole('button', { name: HABIT_COMPLETED_REGEX })
    await expect(completedButton).toBeInTheDocument()

    // もう一度クリックして未完了に戻す
    await userEvent.click(completedButton)

    // 元の状態に戻ったことを確認
    const incompleteButton = canvas.getByRole('button', { name: HABIT_INCOMPLETE_REGEX })
    await expect(incompleteButton).toBeInTheDocument()
  },
}
