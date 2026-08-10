import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta = {
  argTypes: {
    disabled: {
      control: 'boolean',
    },
    scale: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    variant: {
      control: 'select',
      options: ['default', 'primary', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
  },
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Basics/Button',
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Button',
    variant: 'default',
  },
}

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
}

export const Destructive: Story = {
  args: {
    children: 'Delete',
    variant: 'destructive',
  },
}

export const Outline: Story = {
  args: {
    children: 'Outline',
    variant: 'outline',
  },
}

export const Secondary: Story = {
  args: {
    children: 'Secondary',
    variant: 'secondary',
  },
}

export const Ghost: Story = {
  args: {
    children: 'Ghost',
    variant: 'ghost',
  },
}

export const Link: Story = {
  args: {
    children: 'Link',
    variant: 'link',
  },
}

export const Small: Story = {
  args: {
    children: 'Small Button',
    size: 'sm',
  },
}

export const Large: Story = {
  args: {
    children: 'Large Button',
    size: 'lg',
  },
}

export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true,
  },
}

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <svg
          aria-label="Add icon"
          className="h-4 w-4"
          fill="none"
          role="img"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Add Item
      </>
    ),
  },
}

export const IconOnly: Story = {
  args: {
    children: (
      <svg
        aria-label="Add icon"
        className="h-4 w-4"
        fill="none"
        role="img"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    size: 'icon',
    variant: 'outline',
  },
}

export const ScaleSm: Story = {
  args: { children: 'Scale Small', scale: 'sm' },
}

export const ScaleMd: Story = {
  args: { children: 'Scale Medium', scale: 'md' },
}

export const ScaleLg: Story = {
  args: { children: 'Scale Large', scale: 'lg' },
}

export const ScaleNone: Story = {
  args: { children: 'No Scale', scale: 'none' },
}

if (import.meta.vitest) {
  const { describe, expect, it } = await import('vitest')
  const { renderStory } = await import('@/lib/storybook')

  describe(`${meta.title} Stories`, () => {
    it('Defaultがレンダリングされる', () => {
      const { container } = renderStory(Default, meta)
      expect(container).not.toBeEmptyDOMElement()
    })
  })
}
