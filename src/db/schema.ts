import { createId } from '@paralleldrive/cuid2'
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import {
  DEFAULT_HABIT_COLOR,
  DEFAULT_HABIT_FREQUENCY,
  DEFAULT_HABIT_ICON,
  DEFAULT_HABIT_PERIOD,
  DEFAULT_WEEK_START,
} from '@/constants/habit'
import { DEFAULT_COLOR_THEME, DEFAULT_THEME_MODE } from '@/constants/theme'

/**
 * ユーザー情報テーブル
 * Clerkで認証されたユーザーのデータを管理
 */
export const users = pgTable(
  'User',
  {
    /** ユーザーID (CUID2形式) */
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    /** Clerk認証ID */
    clerkId: text('clerkId').notNull(),
    /** メールアドレス */
    email: text('email').notNull(),
    /** 週の開始曜日 (0: 日曜, 1: 月曜) */
    weekStart: text('weekStart').default(DEFAULT_WEEK_START).notNull(),
    /** レコード作成日時 */
    createdAt: timestamp('createdAt', { mode: 'date', withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    /** レコード更新日時 */
    updatedAt: timestamp('updatedAt', { mode: 'date', withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    clerkIdUnique: uniqueIndex('User_clerkId_unique').on(table.clerkId),
    emailUnique: uniqueIndex('User_email_unique').on(table.email),
  })
)

/**
 * ユーザー設定テーブル
 * ユーザーごとの設定情報を管理
 */
export const userSettings = pgTable(
  'UserSettings',
  {
    /** 設定ID (CUID2形式) */
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    /** ユーザーID (外部キー: users.id, UNIQUE) */
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 週の開始曜日 ('monday' | 'sunday') */
    weekStart: text('weekStart').default(DEFAULT_WEEK_START).notNull(),
    /** カラーテーマ ('teal' | 'lime' | ...) */
    colorTheme: text('colorTheme').default(DEFAULT_COLOR_THEME).notNull(),
    /** テーマモード ('light' | 'dark' | 'system') */
    themeMode: text('themeMode').default(DEFAULT_THEME_MODE).notNull(),
    /** レコード作成日時 */
    createdAt: timestamp('createdAt', { mode: 'date', withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    /** レコード更新日時 */
    updatedAt: timestamp('updatedAt', { mode: 'date', withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    userIdUnique: uniqueIndex('UserSettings_userId_unique').on(table.userId),
  })
)

/**
 * 習慣テーブル
 * ユーザーが管理する習慣の情報を保存
 */
export const habits = pgTable(
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
    archived: boolean('archived').default(false).notNull(),
    /** アーカイブ日時 */
    archivedAt: timestamp('archivedAt', { mode: 'date', withTimezone: true }),
    /** レコード作成日時 */
    createdAt: timestamp('createdAt', { mode: 'date', withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    /** レコード更新日時 */
    updatedAt: timestamp('updatedAt', { mode: 'date', withTimezone: true })
      .$defaultFn(() => new Date())
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
export const checkins = pgTable(
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
    /** レコード作成日時 */
    createdAt: timestamp('createdAt', { mode: 'date', withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    habitDateIndex: index('Checkin_habitId_date_idx').on(table.habitId, table.date),
    habitDateUnique: uniqueIndex('Checkin_habitId_date_unique').on(table.habitId, table.date),
  })
)
