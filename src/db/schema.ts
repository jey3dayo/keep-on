import { createId } from '@paralleldrive/cuid2'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
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
export const users = sqliteTable('User', {
  /** Clerk認証ID */
  clerkId: text('clerkId').notNull().unique(),
  /** レコード作成日時 (ISO8601形式) */
  createdAt: text('createdAt')
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  /** メールアドレス */
  email: text('email').notNull().unique(),
  /** ユーザーID (CUID2形式) */
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  /** レコード更新日時 (ISO8601形式) */
  updatedAt: text('updatedAt')
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  /** 週の開始曜日 (0: 日曜, 1: 月曜) */
  weekStart: text('weekStart').default(DEFAULT_WEEK_START).notNull(),
})

/**
 * ユーザー設定テーブル
 * ユーザーごとの設定情報を管理
 */
export const userSettings = sqliteTable('UserSettings', {
  /** カラーテーマ ('teal' | 'lime' | ...) */
  colorTheme: text('colorTheme').default(DEFAULT_COLOR_THEME).notNull(),
  /** レコード作成日時 (ISO8601形式) */
  createdAt: text('createdAt')
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  /** 設定ID (CUID2形式) */
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  /** テーマモード ('light' | 'dark' | 'system') */
  themeMode: text('themeMode').default(DEFAULT_THEME_MODE).notNull(),
  /** レコード更新日時 (ISO8601形式) */
  updatedAt: text('updatedAt')
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  /** ユーザーID (外部キー: users.id, UNIQUE) */
  userId: text('userId')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** 週の開始曜日 ('monday' | 'sunday') */
  weekStart: text('weekStart').default(DEFAULT_WEEK_START).notNull(),
})

/**
 * 習慣テーブル
 * ユーザーが管理する習慣の情報を保存
 */
export const habits = sqliteTable(
  'Habit',
  {
    /** アーカイブ済みフラグ */
    archived: integer('archived', { mode: 'boolean' }).default(false).notNull(),
    /** アーカイブ日時 (ISO8601形式) */
    archivedAt: text('archivedAt'),
    /** 表示色 (Radix Colors) */
    color: text('color').default(DEFAULT_HABIT_COLOR),
    /** レコード作成日時 (ISO8601形式) */
    createdAt: text('createdAt')
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    /** 期間内の目標回数 */
    frequency: integer('frequency').default(DEFAULT_HABIT_FREQUENCY).notNull(),
    /** アイコン識別子 (lucide-react icon name) */
    icon: text('icon').default(DEFAULT_HABIT_ICON),
    /** 習慣ID (CUID2形式) */
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    /** 習慣名 */
    name: text('name').notNull(),
    /** 習慣の期間 (daily: 毎日, weekly: 毎週, monthly: 毎月) */
    period: text('period', { enum: ['daily', 'weekly', 'monthly'] })
      .default(DEFAULT_HABIT_PERIOD)
      .notNull(),
    /** リマインダー時刻 (HH:MM形式, nullable) */
    reminderTime: text('reminderTime'),
    /** レコード更新日時 (ISO8601形式) */
    updatedAt: text('updatedAt')
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    /** ユーザーID (外部キー: users.id) */
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
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
    /** レコード作成日時 (ISO8601形式) */
    createdAt: text('createdAt')
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    /** チェックイン日付 (YYYY-MM-DD形式) */
    date: text('date').notNull(),
    /** 習慣ID (外部キー: habits.id) */
    habitId: text('habitId')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    /** チェックインID (CUID2形式) */
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
  },
  (table) => ({
    habitDateIndex: index('Checkin_habitId_date_idx').on(table.habitId, table.date),
  })
)

/**
 * スキップテーブル
 * 意図的にスキップした日を記録（ストリークを維持したまま休む）
 */
export const habitSkips = sqliteTable(
  'HabitSkip',
  {
    /** レコード作成日時 (ISO8601形式) */
    createdAt: text('createdAt')
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    /** スキップ日付 (YYYY-MM-DD形式) */
    date: text('date').notNull(),
    /** 習慣ID (外部キー: habits.id) */
    habitId: text('habitId')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    /** スキップID (CUID2形式) */
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
  },
  (table) => ({
    habitDateUniqueIndex: uniqueIndex('HabitSkip_habitId_date_unique').on(table.habitId, table.date),
    habitIdIndex: index('HabitSkip_habitId_idx').on(table.habitId),
  })
)
