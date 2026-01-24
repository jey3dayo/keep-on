import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { HabitCircle } from './HabitCircle'

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
  render: (args: typeof meta.args) => {
    const [completed, setCompleted] = useState(args.completed)

    return <HabitCircle {...args} completed={completed} onClick={() => setCompleted(!completed)} />
  },
}
