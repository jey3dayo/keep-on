import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './Input'

const meta = {
  argTypes: {
    disabled: {
      control: 'boolean',
    },
    disablePasswordManagers: {
      control: 'boolean',
    },
    error: {
      control: 'boolean',
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
    },
  },
  component: Input,
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Basics/Input',
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
    defaultValue: 'Sample text',
    type: 'text',
  },
}

export const ErrorState: Story = {
  args: {
    error: true,
    placeholder: 'Enter text...',
    type: 'text',
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Disabled input',
    type: 'text',
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
  args: {
    placeholder: 'Enter username',
    type: 'text',
  },
  render: (args) => (
    <div className="space-y-2">
      <label className="font-medium text-sm" htmlFor="input-with-label">
        Username
      </label>
      <Input id="input-with-label" {...args} />
    </div>
  ),
}

export const WithErrorMessage: Story = {
  args: {
    error: true,
    placeholder: 'your.email@example.com',
    type: 'email',
  },
  render: (args) => (
    <div className="space-y-2">
      <label className="font-medium text-sm" htmlFor="input-with-error">
        Email
      </label>
      <Input id="input-with-error" {...args} />
      <p className="text-destructive text-sm">This email is already taken</p>
    </div>
  ),
}

export const WithPasswordManagers: Story = {
  args: {
    disablePasswordManagers: false,
    placeholder: 'Password managers enabled',
    type: 'password',
  },
}

export const WithoutPasswordManagers: Story = {
  args: {
    disablePasswordManagers: true,
    placeholder: 'Password managers disabled (default)',
    type: 'password',
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

    const decorators = [...(meta.decorators ?? []), ...(story.decorators ?? [])] as Array<
      (Story: () => JSX.Element | null) => JSX.Element | null
    >

    const DecoratedStory = decorators.reduce((Decorated, decorator) => () => decorator(Decorated), StoryComponent)

    return render(<DecoratedStory />)
  }

  describe(`${meta.title} Stories`, () => {
    it('Defaultがレンダリングされる', () => {
      const { container } = renderStory(Default)
      expect(container).not.toBeEmptyDOMElement()
    })
  })
}
