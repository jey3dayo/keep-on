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
