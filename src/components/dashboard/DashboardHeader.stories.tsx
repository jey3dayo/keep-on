import type { Meta, StoryObj } from '@storybook/react'
import { storybookToast } from '@/lib/storybook'
import { DashboardHeader } from './DashboardHeader'

const meta = {
  title: 'Dashboard/DashboardHeader',
  component: DashboardHeader,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DashboardHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Mobile: Story = {
  args: {
    variant: 'mobile',
    todayCompleted: 5,
    totalDaily: 8,
    totalStreak: 12,
  },
}

export const Desktop: Story = {
  args: {
    variant: 'desktop',
    todayCompleted: 5,
    totalDaily: 8,
    totalStreak: 12,
    onAddClick: () => {
      storybookToast.success('追加ボタンがクリックされました', 'これはStorybookでのデモです')
    },
  },
}

export const DesktopCompleted: Story = {
  args: {
    variant: 'desktop',
    todayCompleted: 8,
    totalDaily: 8,
    totalStreak: 30,
    onAddClick: () => {
      storybookToast.success('すべての習慣を完了しました！', '素晴らしい習慣継続です')
    },
  },
}

export const MobileZero: Story = {
  args: {
    variant: 'mobile',
    todayCompleted: 0,
    totalDaily: 5,
    totalStreak: 0,
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
    it('Mobileがレンダリングされる', () => {
      const { container } = renderStory(Mobile)
      expect(container).not.toBeEmptyDOMElement()
    })
  })
}
