import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as schema from '@/db/schema'
import { createSqliteD1 } from './helpers/sqlite-d1'

/**
 * `drizzle-orm` を一切モックせず、`node:sqlite` 上の実 SQLite に対して
 * checkin.ts の raw SQL (`sql` テンプレート) を実行して検証するテスト。
 *
 * モックするのは `@/lib/db` の `getDb` のみ。これにより Drizzle は
 * 実際に SQL 文字列を組み立て、構文誤りがあればここで失敗する。
 */

type DrizzleD1Db = ReturnType<typeof drizzle<typeof schema>>

let liveDb: DrizzleD1Db

vi.mock('@/lib/db', () => ({
  getDb: () => liveDb,
}))

const { createCheckinWithLimit, deleteLatestCheckinByHabitAndPeriod } = await import('../checkin')

const MIGRATIONS_DIR = join(import.meta.dirname, '../../../../drizzle')
const MIGRATION_FILES = [
  '0000_adorable_impossible_man.sql',
  '0001_happy_prowler.sql',
  '0002_small_magus.sql',
  '0003_skip_and_reminder.sql',
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

const { checkins, habits, users } = schema

async function insertUser(id: string) {
  await liveDb.run(sql`INSERT INTO ${users} ("id", "clerkId", "email", "createdAt", "updatedAt")
    VALUES (${id}, ${`clerk_${id}`}, ${`${id}@example.com`}, ${'2024-01-01T00:00:00.000Z'}, ${'2024-01-01T00:00:00.000Z'})`)
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

async function countCheckins(): Promise<number> {
  const rows = await liveDb.all<{ count: number }>(sql`SELECT count(*) AS count FROM ${checkins}`)
  return rows[0]?.count ?? 0
}

async function selectDates(): Promise<string[]> {
  const rows = await liveDb.all<{ date: string }>(
    sql`SELECT ${checkins.date} AS date FROM ${checkins} ORDER BY ${checkins.date}`
  )
  return rows.map((row) => row.date)
}

async function selectIds(): Promise<string[]> {
  const rows = await liveDb.all<{ id: string }>(sql`SELECT ${checkins.id} AS id FROM ${checkins}`)
  return rows.map((row) => row.id)
}

describe('sqlite-d1 shim smoke test', () => {
  beforeEach(() => {
    rebuildDb()
  })

  it('creates the Checkin and Habit tables from the real migrations', async () => {
    const tables = await liveDb.all<{ name: string }>(sql`SELECT name FROM sqlite_master WHERE type = 'table'`)
    const names = tables.map((table) => table.name)
    expect(names).toContain('Checkin')
    expect(names).toContain('Habit')
  })
})

describe('createCheckinWithLimit (real SQLite)', () => {
  beforeEach(() => {
    rebuildDb()
  })

  it('inserts successfully when under the limit', async () => {
    await insertUser('user1')
    await insertHabit('habit1', 'user1', 3)

    const result = await createCheckinWithLimit({
      date: '2024-01-15',
      frequency: 3,
      habitId: 'habit1',
      period: 'daily',
      weekStartDay: 1,
    })

    expect(result.created).toBe(true)
    expect(result.currentCount).toBe(1)
  })

  it('stops at the limit and does not insert a second row when frequency is 1', async () => {
    await insertUser('user1')
    await insertHabit('habit1', 'user1', 1)

    const first = await createCheckinWithLimit({
      date: '2024-01-15',
      frequency: 1,
      habitId: 'habit1',
      period: 'daily',
      weekStartDay: 1,
    })
    const second = await createCheckinWithLimit({
      date: '2024-01-15',
      frequency: 1,
      habitId: 'habit1',
      period: 'daily',
      weekStartDay: 1,
    })

    expect(first.created).toBe(true)
    expect(second.created).toBe(false)
    expect(second.currentCount).toBe(1)
    expect(await countCheckins()).toBe(1)
  })

  it('allows checkins up to frequency and rejects the one after', async () => {
    await insertUser('user1')
    await insertHabit('habit1', 'user1', 3)

    const results: Awaited<ReturnType<typeof createCheckinWithLimit>>[] = []
    for (let i = 0; i < 4; i++) {
      results.push(
        await createCheckinWithLimit({
          date: '2024-01-15',
          frequency: 3,
          habitId: 'habit1',
          period: 'daily',
          weekStartDay: 1,
        })
      )
    }

    expect(results[0].created).toBe(true)
    expect(results[1].created).toBe(true)
    expect(results[2].created).toBe(true)
    expect(results[3].created).toBe(false)
    expect(await countCheckins()).toBe(3)
  })

  it('does not count checkins outside the period toward the limit', async () => {
    await insertUser('user1')
    await insertHabit('habit1', 'user1', 1)
    // 前月のチェックイン（当日の daily 期間の範囲外）
    await insertCheckin('old-checkin', 'habit1', '2023-12-31', '2023-12-31T00:00:00.000Z')

    const result = await createCheckinWithLimit({
      date: '2024-01-15',
      frequency: 1,
      habitId: 'habit1',
      period: 'daily',
      weekStartDay: 1,
    })

    expect(result.created).toBe(true)
    expect(result.currentCount).toBe(1)
  })

  it('returns a well-formed checkin row on success', async () => {
    await insertUser('user1')
    await insertHabit('habit1', 'user1', 3)

    const result = await createCheckinWithLimit({
      date: '2024-01-15',
      frequency: 3,
      habitId: 'habit1',
      period: 'daily',
      weekStartDay: 1,
    })

    expect(result.checkin).not.toBeNull()
    expect(typeof result.checkin?.id).toBe('string')
    expect(typeof result.checkin?.habitId).toBe('string')
    expect(typeof result.checkin?.date).toBe('string')
    expect(typeof result.checkin?.createdAt).toBe('string')
    expect(result.checkin?.habitId).toBe('habit1')
    expect(result.checkin?.date).toBe('2024-01-15')
  })
})

describe('deleteLatestCheckinByHabitAndPeriod (real SQLite)', () => {
  beforeEach(() => {
    rebuildDb()
  })

  it('deletes the single checkin in the period', async () => {
    await insertUser('user1')
    await insertHabit('habit1', 'user1', 3)
    await insertCheckin('c1', 'habit1', '2024-01-15', '2024-01-15T00:00:00.000Z')

    const result = await deleteLatestCheckinByHabitAndPeriod('habit1', '2024-01-15', 'daily', 1)

    expect(result.deleted).toBe(true)
    expect(result.currentCount).toBe(0)
    expect(await countCheckins()).toBe(0)
  })

  it('deletes only one row when three exist in the period', async () => {
    await insertUser('user1')
    await insertHabit('habit1', 'user1', 3)
    await insertCheckin('c1', 'habit1', '2024-01-15', '2024-01-15T00:00:00.000Z')
    await insertCheckin('c2', 'habit1', '2024-01-15', '2024-01-15T01:00:00.000Z')
    await insertCheckin('c3', 'habit1', '2024-01-15', '2024-01-15T02:00:00.000Z')

    const result = await deleteLatestCheckinByHabitAndPeriod('habit1', '2024-01-15', 'daily', 1)

    expect(result.deleted).toBe(true)
    expect(result.currentCount).toBe(2)
    expect(await countCheckins()).toBe(2)
  })

  it('deletes the row with the most recent date', async () => {
    await insertUser('user1')
    await insertHabit('habit1', 'user1', 3)
    // 同一週内の 3 日分（period: weekly で range 内の複数 date を用意する）
    await insertCheckin('c1', 'habit1', '2024-01-15', '2024-01-15T00:00:00.000Z')
    await insertCheckin('c2', 'habit1', '2024-01-16', '2024-01-16T00:00:00.000Z')
    await insertCheckin('c3', 'habit1', '2024-01-17', '2024-01-17T00:00:00.000Z')

    const result = await deleteLatestCheckinByHabitAndPeriod('habit1', '2024-01-15', 'weekly', 1)

    expect(result.deleted).toBe(true)
    expect(result.checkin?.date).toBe('2024-01-17')
    expect(await selectDates()).toEqual(['2024-01-15', '2024-01-16'])
  })

  it('deletes the row with the newer createdAt when dates tie', async () => {
    await insertUser('user1')
    await insertHabit('habit1', 'user1', 3)
    await insertCheckin('older', 'habit1', '2024-01-15', '2024-01-15T00:00:00.000Z')
    await insertCheckin('newer', 'habit1', '2024-01-15', '2024-01-15T12:00:00.000Z')

    const result = await deleteLatestCheckinByHabitAndPeriod('habit1', '2024-01-15', 'daily', 1)

    expect(result.deleted).toBe(true)
    expect(result.checkin?.id).toBe('newer')
    expect(await selectIds()).toEqual(['older'])
  })

  it('does not issue a DELETE and returns deleted:false when nothing is in the period', async () => {
    await insertUser('user1')
    await insertHabit('habit1', 'user1', 3)

    const result = await deleteLatestCheckinByHabitAndPeriod('habit1', '2024-01-15', 'daily', 1)

    expect(result.deleted).toBe(false)
    expect(result.currentCount).toBe(0)
    expect(result.checkin).toBeNull()
  })

  it('does not delete a row outside the period', async () => {
    await insertUser('user1')
    await insertHabit('habit1', 'user1', 3)
    await insertCheckin('outside', 'habit1', '2023-12-31', '2023-12-31T00:00:00.000Z')

    const result = await deleteLatestCheckinByHabitAndPeriod('habit1', '2024-01-15', 'daily', 1)

    expect(result.deleted).toBe(false)
    expect(await countCheckins()).toBe(1)
    expect(await selectIds()).toEqual(['outside'])
  })
})
