import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import type { HabitWithProgress } from '@/types/habit'

// Storybook用の簡易版HabitActionDrawer（依存関係をモック化）
function StorybookHabitActionDrawer({
  open,
  habit,
  onOpenChange,
}: {
  open: boolean
  habit: HabitWithProgress | null
  onOpenChange: (open: boolean) => void
}) {
  if (!habit) {
    return null
  }

  const isArchived = habit.archived || Boolean(habit.archivedAt)

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>習慣の操作</DrawerTitle>
          <DrawerDescription>{habit.name}</DrawerDescription>
        </DrawerHeader>
        <div className="flex gap-2 p-4 pt-0">
          <Button className="flex-1" onClick={() => onOpenChange(false)} variant="outline">
            編集
          </Button>

          {isArchived ? (
            <Button className="flex-1" onClick={() => onOpenChange(false)} variant="destructive">
              削除
            </Button>
          ) : (
            <Button className="flex-1" onClick={() => onOpenChange(false)} variant="secondary">
              アーカイブ
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

const meta = {
  title: 'Streak/HabitActionDrawer',
  component: StorybookHabitActionDrawer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Drawerの開閉状態',
    },
    habit: {
      description: '操作対象の習慣データ',
    },
    onOpenChange: {
      description: '開閉状態が変化したときのコールバック',
    },
  },
} satisfies Meta<typeof StorybookHabitActionDrawer>

export default meta
type Story = StoryObj<typeof meta>

const mockHabit = {
  id: '1',
  name: '毎日水を8杯飲む',
  icon: 'droplets' as const,
  color: 'blue',
  period: 'daily' as const,
  frequency: 8,
  currentProgress: 3,
  streak: 5,
  completionRate: 37,
  archived: false,
  archivedAt: null,
  userId: 'user1',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-28'),
}

export const Default: Story = {
  args: {
    open: true,
    habit: mockHabit,
    onOpenChange: (open) => console.log('Drawer opened:', open),
  },
}

export const WeeklyHabit: Story = {
  args: {
    open: true,
    habit: {
      ...mockHabit,
      id: '2',
      name: '週3回ジョギング',
      icon: 'dumbbell',
      color: 'green',
      period: 'weekly' as const,
      frequency: 3,
      currentProgress: 1,
      streak: 12,
      completionRate: 33,
    },
    onOpenChange: (open) => console.log('Drawer opened:', open),
  },
}

export const MonthlyHabit: Story = {
  args: {
    open: true,
    habit: {
      ...mockHabit,
      id: '3',
      name: '月10回読書',
      icon: 'book-open',
      color: 'purple',
      period: 'monthly' as const,
      frequency: 10,
      currentProgress: 7,
      streak: 3,
      completionRate: 70,
    },
    onOpenChange: (open) => console.log('Drawer opened:', open),
  },
}

export const Completed: Story = {
  args: {
    open: true,
    habit: {
      ...mockHabit,
      id: '4',
      name: '完了した習慣',
      currentProgress: 8,
      streak: 30,
      completionRate: 100,
    },
    onOpenChange: (open) => console.log('Drawer opened:', open),
  },
}

export const Closed: Story = {
  args: {
    open: false,
    habit: mockHabit,
    onOpenChange: (open) => console.log('Drawer opened:', open),
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
