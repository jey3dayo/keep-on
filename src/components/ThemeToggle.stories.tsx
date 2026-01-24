import type { Meta, StoryObj } from '@storybook/react'
import type { ComponentType } from 'react'
import { expect, userEvent, within } from 'storybook/test'
import { ThemeProvider } from './ThemeProvider'
import { ThemeToggle } from './ThemeToggle'

// Test regex pattern
const THEME_TOGGLE_REGEX = /モードに切り替え/i

const meta = {
  title: 'Components/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story: ComponentType) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof ThemeToggle>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // テーマトグルボタンを取得（aria-labelで検索）
    const toggleButton = canvas.getByRole('button', { name: THEME_TOGGLE_REGEX })

    // ボタンが存在することを確認
    await expect(toggleButton).toBeInTheDocument()

    // クリックしてテーマを切り替え
    await userEvent.click(toggleButton)

    // 切り替え後もボタンが存在することを確認
    await expect(toggleButton).toBeInTheDocument()
  },
}

export const WithDescription: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-4">
      <ThemeToggle />
      <p className="text-muted-foreground text-sm">Click to toggle theme</p>
    </div>
  ),
}

export const InHeader: Story = {
  render: () => (
    <header className="flex items-center justify-between rounded-lg border bg-card p-4">
      <h1 className="font-bold text-xl">KeepOn</h1>
      <ThemeToggle />
    </header>
  ),
}

export const Multiple: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <ThemeToggle />
      <ThemeToggle />
      <ThemeToggle />
    </div>
  ),
}
