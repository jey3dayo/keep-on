import type { Meta, StoryObj } from '@storybook/react'
import { Icon, type IconName } from './Icon'

const meta = {
  title: 'Basics/Icon',
  component: Icon,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Icon>

export default meta
type Story = StoryObj<typeof meta>

const iconNames: IconName[] = ['check', 'moon', 'plus', 'sun', 'trash']

export const Gallery: Story = {
  render: () => (
    <div className="grid grid-cols-5 gap-4">
      {iconNames.map((name) => (
        <div className="flex flex-col items-center gap-2" key={name}>
          <Icon data-testid={`icon-${name}`} name={name} size={32} />
          <span className="text-sm">{name}</span>
        </div>
      ))}
    </div>
  ),
}

export const WithProps: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Icon name="check" size={16} />
        <Icon name="check" size={24} />
        <Icon name="check" size={32} />
        <Icon name="check" size={48} />
      </div>
      <div className="flex items-center gap-4">
        <Icon color="red" name="sun" size={32} />
        <Icon color="blue" name="moon" size={32} />
        <Icon color="green" name="plus" size={32} />
        <Icon color="gray" name="trash" size={32} />
      </div>
      <div className="flex items-center gap-4">
        <Icon name="check" size={32} strokeWidth={1} />
        <Icon name="check" size={32} strokeWidth={2} />
        <Icon name="check" size={32} strokeWidth={3} />
      </div>
    </div>
  ),
}

export const Accessibility: Story = {
  render: () => (
    <button className="flex items-center gap-2" type="button">
      <Icon aria-hidden="true" name="trash" />
      <span>削除</span>
    </button>
  ),
}
