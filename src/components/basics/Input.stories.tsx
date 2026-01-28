import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './Input'

const meta = {
  title: 'Basics/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
    },
    error: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    disablePasswordManagers: {
      control: 'boolean',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
    type: 'text',
  },
}

export const WithValue: Story = {
  args: {
    value: 'Sample text',
    type: 'text',
  },
}

export const ErrorState: Story = {
  args: {
    placeholder: 'Enter text...',
    type: 'text',
    error: true,
  },
}

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    type: 'text',
    disabled: true,
  },
}

export const Email: Story = {
  args: {
    placeholder: 'your.email@example.com',
    type: 'email',
  },
}

export const Password: Story = {
  args: {
    placeholder: 'Enter password',
    type: 'password',
  },
}

export const NumberInput: Story = {
  args: {
    placeholder: '0',
    type: 'number',
  },
}

export const WithLabel: Story = {
  render: (args) => (
    <div className="space-y-2">
      <label className="font-medium text-sm" htmlFor="input-with-label">
        Username
      </label>
      <Input id="input-with-label" {...args} />
    </div>
  ),
  args: {
    placeholder: 'Enter username',
    type: 'text',
  },
}

export const WithErrorMessage: Story = {
  render: (args) => (
    <div className="space-y-2">
      <label className="font-medium text-sm" htmlFor="input-with-error">
        Email
      </label>
      <Input id="input-with-error" {...args} />
      <p className="text-destructive text-sm">This email is already taken</p>
    </div>
  ),
  args: {
    placeholder: 'your.email@example.com',
    type: 'email',
    error: true,
  },
}

export const WithPasswordManagers: Story = {
  args: {
    placeholder: 'Password managers enabled',
    type: 'password',
    disablePasswordManagers: false,
  },
}

export const WithoutPasswordManagers: Story = {
  args: {
    placeholder: 'Password managers disabled (default)',
    type: 'password',
    disablePasswordManagers: true,
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
