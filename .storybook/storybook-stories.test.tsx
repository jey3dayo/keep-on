import { describe, expect, it } from 'vitest'
import { renderStory } from '@/lib/storybook'
import calendarMeta, { Empty as EmptyCalendar } from '../src/components/habits/HabitCalendarHeatmap.stories'

describe('Storybook stories without in-source tests', () => {
  it('renders the empty calendar heatmap story', () => {
    const { container } = renderStory(EmptyCalendar, calendarMeta)
    expect(container).not.toBeEmptyDOMElement()
  })
})
