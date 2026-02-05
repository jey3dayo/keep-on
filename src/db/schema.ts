import { createId } from '@paralleldrive/cuid2'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import {
  DEFAULT_HABIT_COLOR,
  DEFAULT_HABIT_FREQUENCY,
  DEFAULT_HABIT_ICON,
  DEFAULT_HABIT_PERIOD,
  DEFAULT_WEEK_START,
} from '@/constants/habit'

export const users = sqliteTable('User', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  clerkId: text('clerkId').notNull().unique(),
  email: text('email').notNull().unique(),
  weekStart: text('weekStart').default(DEFAULT_WEEK_START).notNull(),
  createdAt: text('createdAt')
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  updatedAt: text('updatedAt')
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
})

export const habits = sqliteTable(
  'Habit',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    icon: text('icon').default(DEFAULT_HABIT_ICON),
    color: text('color').default(DEFAULT_HABIT_COLOR),
    period: text('period', { enum: ['daily', 'weekly', 'monthly'] })
      .default(DEFAULT_HABIT_PERIOD)
      .notNull(),
    frequency: integer('frequency').default(DEFAULT_HABIT_FREQUENCY).notNull(),
    archived: integer('archived', { mode: 'boolean' }).default(false).notNull(),
    archivedAt: text('archivedAt'),
    createdAt: text('createdAt')
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    updatedAt: text('updatedAt')
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
  },
  (table) => ({
    userIdIndex: index('Habit_userId_idx').on(table.userId),
  })
)

export const checkins = sqliteTable(
  'Checkin',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    habitId: text('habitId')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    createdAt: text('createdAt')
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
  },
  (table) => ({
    habitDateIndex: index('Checkin_habitId_date_idx').on(table.habitId, table.date),
  })
)
