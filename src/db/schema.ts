import { createId } from '@paralleldrive/cuid2'
import { pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'

export const users = pgTable('User', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  clerkId: text('clerkId').notNull().unique(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
})

export const habits = pgTable('Habit', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  emoji: text('emoji'),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
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
    date: timestamp('date', { mode: 'date' }).notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [unique().on(table.habitId, table.date)]
)
