import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { HabitCircle } from './HabitCircle'

const meta = {
  title: 'Habits/HabitCircle',
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
    icon: {
      control: 'text',
    },
  },
} satisfies Meta<typeof HabitCircle>

export default meta
type Story = StoryObj<typeof meta>

export const Incomplete: Story = {
  args: {
    habitName: 'Morning Exercise',
    icon: 'footprints',
    completed: false,
  },
}

export const Completed: Story = {
  args: {
    habitName: 'Morning Exercise',
    icon: 'footprints',
    completed: true,
  },
}

export const Small: Story = {
  args: {
    habitName: 'Read a book',
    icon: 'book-open',
    completed: false,
    size: 'sm',
  },
}

export const Medium: Story = {
  args: {
    habitName: 'Meditation',
    icon: 'brain',
    completed: false,
    size: 'md',
  },
}

export const Large: Story = {
  args: {
    habitName: 'Workout',
    icon: 'dumbbell',
    completed: false,
    size: 'lg',
  },
}

export const WithoutIcon: Story = {
  args: {
    habitName: 'Daily Goal',
    icon: null,
    completed: false,
  },
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <HabitCircle completed={false} habitName="Small habit" icon="footprints" size="sm" />
      <HabitCircle completed={false} habitName="Small habit" icon="footprints" size="sm" />
      <HabitCircle completed={false} habitName="Medium habit" icon="book-open" size="md" />
      <HabitCircle completed={false} habitName="Large habit" icon="dumbbell" size="lg" />
    </div>
  ),
}

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <HabitCircle completed={false} habitName="Running" icon="footprints" size="md" />
          <span className="text-muted-foreground text-sm">Incomplete</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <HabitCircle completed={true} habitName="Running" icon="footprints" size="md" />
          <span className="text-muted-foreground text-sm">Completed</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <HabitCircle completed={false} habitName="Small" icon="book-open" size="sm" />
        <HabitCircle completed={false} habitName="Medium" icon="target" size="md" />
        <HabitCircle completed={false} habitName="Large" icon="dumbbell" size="lg" />
      </div>
    </div>
  ),
}

export const Interactive: Story = {
  args: {
    habitName: 'Click me!',
    icon: 'target',
    completed: false,
  },
  render: (args) => {
    const [completed, setCompleted] = useState(args.completed)

    return <HabitCircle {...args} completed={completed} onClick={() => setCompleted(!completed)} />
  },
}
