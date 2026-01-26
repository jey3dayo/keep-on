import { createId } from '@paralleldrive/cuid2'
import { date, integer, pgEnum, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import {
  DEFAULT_HABIT_COLOR,
  DEFAULT_HABIT_FREQUENCY,
  DEFAULT_HABIT_ICON,
  DEFAULT_HABIT_PERIOD,
} from '@/constants/habit'

export const taskPeriodEnum = pgEnum('task_period', ['daily', 'weekly', 'monthly'])

export const users = pgTable('User', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  clerkId: text('clerkId').notNull().unique(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' })
    .$onUpdate(() => new Date())
    .defaultNow()
    .notNull(),
})

export const habits = pgTable('Habit', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon').default(DEFAULT_HABIT_ICON),
  color: text('color').default(DEFAULT_HABIT_COLOR),
  period: taskPeriodEnum('period').default(DEFAULT_HABIT_PERIOD).notNull(),
  frequency: integer('frequency').default(DEFAULT_HABIT_FREQUENCY).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' })
    .$onUpdate(() => new Date())
    .defaultNow()
    .notNull(),
})

export const checkins = pgTable(
  'Checkin',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    habitId: text('habitId')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    date: date('date', { mode: 'date' }).notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [unique().on(table.habitId, table.date)]
)
