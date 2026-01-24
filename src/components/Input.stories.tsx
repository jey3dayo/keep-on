import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from 'storybook/test'
import { Input } from './Input'

// Test regex patterns
const ENTER_TEXT_REGEX = /enter text/i
const BORDER_DESTRUCTIVE_REGEX = /border-destructive/

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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByPlaceholderText(ENTER_TEXT_REGEX)

    // テキスト入力
    await userEvent.type(input, 'Hello World')

    // 入力値を確認
    await expect(input).toHaveValue('Hello World')
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByPlaceholderText(ENTER_TEXT_REGEX)

    // エラー状態のクラスを確認
    await expect(input).toHaveClass(BORDER_DESTRUCTIVE_REGEX)

    // 既存の値を確認
    await expect(input).toHaveValue('Invalid input')
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
