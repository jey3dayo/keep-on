import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as schema from '@/db/schema'
import { createSqliteD1 } from './helpers/sqlite-d1'

/**
 * `getHabitCalendarData` の userId スコープ検証。
 * 実 SQLite 上で habits への JOIN を実行し、他ユーザーの habitId を渡した際に
 * 空データが返ること（データ漏洩しないこと）を確認する。
 */

type DrizzleD1Db = ReturnType<typeof drizzle<typeof schema>>

let liveDb: DrizzleD1Db

vi.mock('@/lib/db', () => ({
  getDb: () => liveDb,
}))

const { getHabitCalendarData } = await import('../habit-calendar')

const MIGRATIONS_DIR = join(import.meta.dirname, '../../../../drizzle')
const MIGRATION_FILES = [
  '0000_adorable_impossible_man.sql',
  '0001_happy_prowler.sql',
  '0002_small_magus.sql',
  '0003_skip_and_reminder.sql',
  '0004_external_id.sql',
]

function rebuildDb() {
  const { d1, sqlite } = createSqliteD1()
  for (const file of MIGRATION_FILES) {
    const content = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8')
    const statements = content
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0)
    for (const statement of statements) {
      sqlite.exec(statement)
    }
  }
  liveDb = drizzle(d1, { schema })
}

const { checkins, habits, habitSkips, users } = schema

async function insertUser(id: string) {
  await liveDb.run(sql`INSERT INTO ${users} ("id", "externalId", "email", "createdAt", "updatedAt")
    VALUES (${id}, ${`access_${id}`}, ${`${id}@example.com`}, ${'2024-01-01T00:00:00.000Z'}, ${'2024-01-01T00:00:00.000Z'})`)
}

async function insertHabit(id: string, userId: string, frequency: number) {
  await liveDb.run(sql`INSERT INTO ${habits} ("id", "userId", "name", "period", "frequency", "createdAt", "updatedAt")
    VALUES (${id}, ${userId}, ${'Test habit'}, ${'daily'}, ${frequency}, ${'2024-01-01T00:00:00.000Z'}, ${'2024-01-01T00:00:00.000Z'})`)
}

async function insertCheckin(id: string, habitId: string, date: string, createdAt: string) {
  await liveDb.run(
    sql`INSERT INTO ${checkins} ("id", "habitId", "date", "createdAt") VALUES (${id}, ${habitId}, ${date}, ${createdAt})`
  )
}

async function insertSkip(id: string, habitId: string, date: string, createdAt: string) {
  await liveDb.run(
    sql`INSERT INTO ${habitSkips} ("id", "habitId", "date", "createdAt") VALUES (${id}, ${habitId}, ${date}, ${createdAt})`
  )
}

describe('getHabitCalendarData (real SQLite)', () => {
  beforeEach(() => {
    rebuildDb()
  })

  it('所有者が habitId とチェックイン日を渡すと自身のチェックイン件数を返す', async () => {
    await insertUser('user1')
    await insertHabit('habit1', 'user1', 1)
    const today = new Date().toISOString().slice(0, 10)
    await insertCheckin('c1', 'habit1', today, '2024-01-15T00:00:00.000Z')

    const result = await getHabitCalendarData('habit1', 'user1')

    expect(result.checkinCounts.get(today)).toBe(1)
  })

  it('他ユーザーの habitId を渡すとチェックインもスキップも空を返す（漏洩しない）', async () => {
    await insertUser('user1')
    await insertUser('user2')
    await insertHabit('habit1', 'user1', 1)
    const today = new Date().toISOString().slice(0, 10)
    await insertCheckin('c1', 'habit1', today, '2024-01-15T00:00:00.000Z')
    await insertSkip('s1', 'habit1', today, '2024-01-15T00:00:00.000Z')

    const result = await getHabitCalendarData('habit1', 'user2')

    expect(result.checkinCounts.size).toBe(0)
    expect(result.skipDates.size).toBe(0)
  })

  it('存在しない habitId を渡すと空を返す', async () => {
    await insertUser('user1')

    const result = await getHabitCalendarData('missing-habit', 'user1')

    expect(result.checkinCounts.size).toBe(0)
    expect(result.skipDates.size).toBe(0)
  })
})
