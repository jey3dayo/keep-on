import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './Input'

const meta = {
  title: 'Components/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    error: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    placeholder: {
      control: 'text',
    },
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
}

export const WithValue: Story = {
  args: {
    value: 'Sample text',
    placeholder: 'Enter text...',
  },
}

export const ErrorState: Story = {
  args: {
    error: true,
    placeholder: 'Enter text...',
    value: 'Invalid input',
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Disabled input...',
  },
}

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password...',
    disablePasswordManagers: false,
  },
}

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'Enter email...',
  },
}

export const AllStates: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-4">
      <Input placeholder="Default input" />
      <Input error placeholder="Error input" />
      <Input disabled placeholder="Disabled input" />
      <Input disablePasswordManagers={false} placeholder="Password input" type="password" />
    </div>
  ),
}
