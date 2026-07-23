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
  argTypes: {
    habit: {
      description: '操作対象の習慣データ',
    },
    onOpenChange: {
      description: '開閉状態が変化したときのコールバック',
    },
    open: {
      control: 'boolean',
      description: 'Drawerの開閉状態',
    },
  },
  component: StorybookHabitActionDrawer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Dashboard/HabitActionDrawer',
} satisfies Meta<typeof StorybookHabitActionDrawer>

export default meta
type Story = StoryObj<typeof meta>

// モック習慣データ
const mockHabit = {
  archived: false,
  archivedAt: null,
  color: 'blue',
  completionRate: 37,
  createdAt: new Date('2025-01-01'),
  currentProgress: 3,
  frequency: 8,
  icon: 'droplets' as const,
  id: '1',
  name: '毎日水を8杯飲む',
  period: 'daily' as const,
  streak: 5,
  updatedAt: new Date('2025-01-28'),
  userId: 'user1',
}

export const Default: Story = {
  args: {
    habit: mockHabit,
    onOpenChange: (open) => console.log('Drawer opened:', open),
    open: true,
  },
}

export const WeeklyHabit: Story = {
  args: {
    habit: {
      ...mockHabit,
      color: 'green',
      completionRate: 33,
      currentProgress: 1,
      frequency: 3,
      icon: 'dumbbell',
      id: '2',
      name: '週3回ジョギング',
      period: 'weekly' as const,
      streak: 12,
    },
    onOpenChange: (open) => console.log('Drawer opened:', open),
    open: true,
  },
}

export const MonthlyHabit: Story = {
  args: {
    habit: {
      ...mockHabit,
      color: 'purple',
      completionRate: 70,
      currentProgress: 7,
      frequency: 10,
      icon: 'book-open',
      id: '3',
      name: '月10回読書',
      period: 'monthly' as const,
      streak: 3,
    },
    onOpenChange: (open) => console.log('Drawer opened:', open),
    open: true,
  },
}

export const Completed: Story = {
  args: {
    habit: {
      ...mockHabit,
      completionRate: 100,
      currentProgress: 8,
      id: '4',
      name: '完了した習慣',
      streak: 30,
    },
    onOpenChange: (open) => console.log('Drawer opened:', open),
    open: true,
  },
}

export const Archived: Story = {
  args: {
    habit: {
      ...mockHabit,
      archived: true,
      archivedAt: new Date('2025-01-15').toISOString(),
      id: '5',
      name: 'アーカイブされた習慣',
    },
    onOpenChange: (open) => console.log('Drawer opened:', open),
    open: true,
  },
}

export const Closed: Story = {
  args: {
    habit: mockHabit,
    onOpenChange: (open) => console.log('Drawer opened:', open),
    open: false,
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
