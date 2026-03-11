import type { Meta, StoryObj } from '@storybook/react'
import { format, subDays } from 'date-fns'
import { HabitCalendarHeatmap } from './HabitCalendarHeatmap'

const meta = {
  title: 'Habits/HabitCalendarHeatmap',
  component: HabitCalendarHeatmap,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof HabitCalendarHeatmap>

export default meta
type Story = StoryObj<typeof meta>

const today = new Date()

function dateKey(daysAgo: number) {
  return format(subDays(today, daysAgo), 'yyyy-MM-dd')
}

/** frequency=1 の習慣: バイナリ（やった/やってない） */
const binaryCheckinCounts = new Map<string, number>([
  [dateKey(0), 1],
  [dateKey(1), 1],
  [dateKey(3), 1],
  [dateKey(5), 1],
  [dateKey(7), 1],
  [dateKey(8), 1],
  [dateKey(10), 1],
  [dateKey(14), 1],
  [dateKey(20), 1],
  [dateKey(30), 1],
])

/** frequency=3 の習慣: 1〜3 回のグラデーション */
const gradientCheckinCounts = new Map<string, number>([
  [dateKey(0), 3], // 100% 達成
  [dateKey(1), 2], // 67% 達成
  [dateKey(2), 1], // 33% 達成
  [dateKey(3), 3],
  [dateKey(5), 2],
  [dateKey(6), 1],
  [dateKey(7), 3],
  [dateKey(8), 3],
  [dateKey(9), 2],
  [dateKey(10), 1],
  [dateKey(14), 3],
  [dateKey(15), 2],
  [dateKey(20), 3],
  [dateKey(25), 1],
  [dateKey(30), 3],
  [dateKey(40), 2],
  [dateKey(50), 3],
])

const skipDates = [dateKey(4), dateKey(11), dateKey(18)]

export const Frequency1: Story = {
  name: '頻度1（バイナリ）',
  args: {
    accentColor: 'oklch(0.65 0.18 250)',
    checkinCounts: binaryCheckinCounts,
    frequency: 1,
    skipDates,
    months: 3,
  },
}

export const Frequency3Gradient: Story = {
  name: '頻度3（グラデーション）',
  args: {
    accentColor: 'oklch(0.70 0.18 145)',
    checkinCounts: gradientCheckinCounts,
    frequency: 3,
    skipDates,
    months: 3,
  },
}

export const Empty: Story = {
  name: '記録なし',
  args: {
    accentColor: 'oklch(0.70 0.18 45)',
    checkinCounts: new Map(),
    frequency: 2,
    months: 2,
  },
}

export const AllComplete: Story = {
  name: '全日達成',
  args: {
    accentColor: 'oklch(0.65 0.22 25)',
    checkinCounts: new Map(Array.from({ length: 30 }, (_, i) => [dateKey(i), 2] as [string, number])),
    frequency: 2,
    months: 2,
  },
}
