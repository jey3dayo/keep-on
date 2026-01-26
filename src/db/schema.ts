import { createId } from '@paralleldrive/cuid2'
import { date, integer, pgEnum, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'

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
  icon: text('icon').default('water'),
  color: text('color').default('orange'),
  period: taskPeriodEnum('period').default('daily').notNull(),
  frequency: integer('frequency').default(1).notNull(),
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
