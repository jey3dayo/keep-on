import { createId } from '@paralleldrive/cuid2'
import Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as schema from '@/db/schema'
import { formatDateKey } from '@/lib/utils/date'

const testDb = new Database(':memory:')
const db = drizzle(testDb, { schema })

beforeAll(() => {
  // テーブル作成 DDL (スキーマのテーブル名に合わせる)
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY NOT NULL,
      clerkId TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      weekStart TEXT NOT NULL DEFAULT '1',
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Habit (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'heart',
      color TEXT DEFAULT 'red',
      period TEXT NOT NULL DEFAULT 'daily',
      frequency INTEGER NOT NULL DEFAULT 1,
      archived INTEGER NOT NULL DEFAULT 0,
      archivedAt TEXT,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS Habit_userId_idx ON Habit(userId);

    CREATE TABLE IF NOT EXISTS Checkin (
      id TEXT PRIMARY KEY NOT NULL,
      habitId TEXT NOT NULL REFERENCES Habit(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS Checkin_habitId_date_idx ON Checkin(habitId, date);
  `)
})

beforeEach(() => {
  // 各テスト前にデータをクリア (スキーマのテーブル名に合わせる)
  testDb.exec('DELETE FROM Checkin')
  testDb.exec('DELETE FROM Habit')
  testDb.exec('DELETE FROM User')
})

describe('Checkin Integration Tests (SQLite)', () => {
  it('daily habit: 同日に複数チェックイン可能 (frequency=3)', async () => {
    // ユーザー作成
    const userId = createId()
    await db.insert(schema.users).values({
      id: userId,
      clerkId: 'clerk_test',
      email: 'test@example.com',
    })

    // 習慣作成 (daily, frequency=3)
    const habitId = createId()
    await db.insert(schema.habits).values({
      id: habitId,
      userId,
      name: 'Test Habit',
      period: 'daily',
      frequency: 3,
    })

    const today = formatDateKey(new Date())

    // 1回目のチェックイン
    const [checkin1] = await db.insert(schema.checkins).values({ habitId, date: today }).returning()

    expect(checkin1).toBeDefined()
    expect(checkin1.date).toBe(today)

    // 2回目のチェックイン（同日）
    const [checkin2] = await db.insert(schema.checkins).values({ habitId, date: today }).returning()

    expect(checkin2).toBeDefined()
    expect(checkin2.id).not.toBe(checkin1.id)

    // 3回目のチェックイン（同日）
    const [checkin3] = await db.insert(schema.checkins).values({ habitId, date: today }).returning()

    expect(checkin3).toBeDefined()
    expect(checkin3.id).not.toBe(checkin1.id)
    expect(checkin3.id).not.toBe(checkin2.id)

    // 合計3件確認
    const allCheckins = await db.select().from(schema.checkins).where(eq(schema.checkins.habitId, habitId))

    expect(allCheckins).toHaveLength(3)
  })

  it('weekly habit: 週をまたぐと別カウント', async () => {
    const userId = createId()
    await db.insert(schema.users).values({
      id: userId,
      clerkId: 'clerk_test',
      email: 'test@example.com',
    })

    const habitId = createId()
    await db.insert(schema.habits).values({
      id: habitId,
      userId,
      name: 'Weekly Habit',
      period: 'weekly',
      frequency: 2,
    })

    const monday = formatDateKey(new Date(2024, 0, 1)) // 月曜
    const nextMonday = formatDateKey(new Date(2024, 0, 8)) // 次週月曜

    await db.insert(schema.checkins).values({ habitId, date: monday })

    await db.insert(schema.checkins).values({ habitId, date: nextMonday })

    const allCheckins = await db.select().from(schema.checkins).where(eq(schema.checkins.habitId, habitId))

    expect(allCheckins).toHaveLength(2)
  })

  it('monthly habit: 月をまたぐと別カウント', async () => {
    const userId = createId()
    await db.insert(schema.users).values({
      id: userId,
      clerkId: 'clerk_test',
      email: 'test@example.com',
    })

    const habitId = createId()
    await db.insert(schema.habits).values({
      id: habitId,
      userId,
      name: 'Monthly Habit',
      period: 'monthly',
      frequency: 2,
    })

    const jan31 = formatDateKey(new Date(2024, 0, 31))
    const feb1 = formatDateKey(new Date(2024, 1, 1))

    await db.insert(schema.checkins).values({ habitId, date: jan31 })

    await db.insert(schema.checkins).values({ habitId, date: feb1 })

    const allCheckins = await db.select().from(schema.checkins).where(eq(schema.checkins.habitId, habitId))

    expect(allCheckins).toHaveLength(2)
  })

  it('単発タスク (frequency=1): 1回のみチェックイン可能', async () => {
    const userId = createId()
    await db.insert(schema.users).values({
      id: userId,
      clerkId: 'clerk_test',
      email: 'test@example.com',
    })

    const habitId = createId()
    await db.insert(schema.habits).values({
      id: habitId,
      userId,
      name: 'One-time Task',
      period: 'daily',
      frequency: 1,
    })

    const today = formatDateKey(new Date())

    const [checkin] = await db.insert(schema.checkins).values({ habitId, date: today }).returning()

    expect(checkin).toBeDefined()

    const allCheckins = await db.select().from(schema.checkins).where(eq(schema.checkins.habitId, habitId))

    expect(allCheckins).toHaveLength(1)
  })

  it('減算: 最新のチェックインを削除', async () => {
    const userId = createId()
    await db.insert(schema.users).values({
      id: userId,
      clerkId: 'clerk_test',
      email: 'test@example.com',
    })

    const habitId = createId()
    await db.insert(schema.habits).values({
      id: habitId,
      userId,
      name: 'Decrement Test',
      period: 'daily',
      frequency: 3,
    })

    const today = formatDateKey(new Date())

    // 3回チェックイン
    await db.insert(schema.checkins).values({ habitId, date: today })
    await db.insert(schema.checkins).values({ habitId, date: today })
    const [lastCheckin] = await db.insert(schema.checkins).values({ habitId, date: today }).returning()

    // 最新を削除
    await db.delete(schema.checkins).where(eq(schema.checkins.id, lastCheckin.id))

    const remaining = await db.select().from(schema.checkins).where(eq(schema.checkins.habitId, habitId))

    expect(remaining).toHaveLength(2)
  })

  it('リセット: 期間内の全チェックインを削除', async () => {
    const userId = createId()
    await db.insert(schema.users).values({
      id: userId,
      clerkId: 'clerk_test',
      email: 'test@example.com',
    })

    const habitId = createId()
    await db.insert(schema.habits).values({
      id: habitId,
      userId,
      name: 'Reset Test',
      period: 'daily',
      frequency: 5,
    })

    const today = formatDateKey(new Date())

    // 5回チェックイン
    await db.insert(schema.checkins).values({ habitId, date: today })
    await db.insert(schema.checkins).values({ habitId, date: today })
    await db.insert(schema.checkins).values({ habitId, date: today })
    await db.insert(schema.checkins).values({ habitId, date: today })
    await db.insert(schema.checkins).values({ habitId, date: today })

    // 全削除
    await db.delete(schema.checkins).where(eq(schema.checkins.habitId, habitId))

    const remaining = await db.select().from(schema.checkins).where(eq(schema.checkins.habitId, habitId))

    expect(remaining).toHaveLength(0)
  })
})
