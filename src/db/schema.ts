import { createId } from '@paralleldrive/cuid2'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import {
  DEFAULT_HABIT_COLOR,
  DEFAULT_HABIT_FREQUENCY,
  DEFAULT_HABIT_ICON,
  DEFAULT_HABIT_PERIOD,
  DEFAULT_WEEK_START,
} from '@/constants/habit'

/**
 * ユーザー情報テーブル
 * Clerkで認証されたユーザーのデータを管理
 */
export const users = sqliteTable('User', {
  /** ユーザーID (CUID2形式) */
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  /** Clerk認証ID */
  clerkId: text('clerkId').notNull().unique(),
  /** メールアドレス */
  email: text('email').notNull().unique(),
  /** 週の開始曜日 (0: 日曜, 1: 月曜) */
  weekStart: text('weekStart').default(DEFAULT_WEEK_START).notNull(),
  /** レコード作成日時 (ISO8601形式) */
  createdAt: text('createdAt')
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  /** レコード更新日時 (ISO8601形式) */
  updatedAt: text('updatedAt')
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
})

/**
 * 習慣テーブル
 * ユーザーが管理する習慣の情報を保存
 */
export const habits = sqliteTable(
  'Habit',
  {
    /** 習慣ID (CUID2形式) */
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    /** ユーザーID (外部キー: users.id) */
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 習慣名 */
    name: text('name').notNull(),
    /** アイコン識別子 (lucide-react icon name) */
    icon: text('icon').default(DEFAULT_HABIT_ICON),
    /** 表示色 (Radix Colors) */
    color: text('color').default(DEFAULT_HABIT_COLOR),
    /** 習慣の期間 (daily: 毎日, weekly: 毎週, monthly: 毎月) */
    period: text('period', { enum: ['daily', 'weekly', 'monthly'] })
      .default(DEFAULT_HABIT_PERIOD)
      .notNull(),
    /** 期間内の目標回数 */
    frequency: integer('frequency').default(DEFAULT_HABIT_FREQUENCY).notNull(),
    /** アーカイブ済みフラグ */
    archived: integer('archived', { mode: 'boolean' }).default(false).notNull(),
    /** アーカイブ日時 (ISO8601形式) */
    archivedAt: text('archivedAt'),
    /** レコード作成日時 (ISO8601形式) */
    createdAt: text('createdAt')
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    /** レコード更新日時 (ISO8601形式) */
    updatedAt: text('updatedAt')
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
  },
  (table) => ({
    userIdIndex: index('Habit_userId_idx').on(table.userId),
  })
)

/**
 * チェックインテーブル
 * 習慣の実行記録を保存
 */
export const checkins = sqliteTable(
  'Checkin',
  {
    /** チェックインID (CUID2形式) */
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    /** 習慣ID (外部キー: habits.id) */
    habitId: text('habitId')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    /** チェックイン日付 (YYYY-MM-DD形式) */
    date: text('date').notNull(),
    /** レコード作成日時 (ISO8601形式) */
    createdAt: text('createdAt')
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
  },
  (table) => ({
    habitDateIndex: index('Checkin_habitId_date_idx').on(table.habitId, table.date),
  })
)
