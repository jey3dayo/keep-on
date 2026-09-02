import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as schema from '@/db/schema'
import { createSqliteD1 } from '@/lib/queries/__tests__/helpers/sqlite-d1'
import { getHabitById } from '@/lib/queries/habit'
import { getServerDateKey } from '@/lib/server/date'
import { syncUser } from '@/lib/user'
import { resetHabitProgressAction } from '../reset'

type DrizzleD1Db = ReturnType<typeof drizzle<typeof schema>>
type Habit = typeof schema.habits.$inferSelect

let liveDb: DrizzleD1Db

vi.mock('@/lib/db', () => ({
  getDb: () => liveDb,
}))

vi.mock('@/lib/queries/habit', () => ({
  getHabitById: vi.fn(),
}))

vi.mock('@/lib/server/date', () => ({
  getServerDateKey: vi.fn(),
}))

vi.mock('@/lib/user', () => ({
  syncUser: vi.fn(),
}))

vi.mock('../utils', () => ({
  revalidateHabitPaths: vi.fn(),
  serializeActionError: vi.fn(),
}))

const MIGRATIONS_DIR = join(import.meta.dirname, '../../../../../drizzle')
const MIGRATION_FILES = [
  '0000_adorable_impossible_man.sql',
  '0001_happy_prowler.sql',
  '0002_small_magus.sql',
  '0003_skip_and_reminder.sql',
  '0004_external_id.sql',
  '0005_checkin_op.sql',
  '0006_checkin_op_created_at_idx.sql',
  '0007_bitter_thunderball.sql',
]

const todayKey = '2026-08-13'
const habitId = 'habit-123'
const userId = 'user-123'

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

function buildHabit(period: Habit['period']): Habit {
  return {
    archived: false,
    archivedAt: null,
    color: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    frequency: 1,
    icon: null,
    id: habitId,
    name: 'Test Habit',
    period,
    reminderTime: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
    userId,
  }
}

async function seedHabit() {
  await liveDb.run(
    sql`INSERT INTO ${schema.users} ("id", "externalId", "email", "createdAt", "updatedAt")
      VALUES (${userId}, ${`access_${userId}`}, ${`${userId}@example.com`}, ${'2026-01-01T00:00:00.000Z'}, ${'2026-01-01T00:00:00.000Z'})`
  )
  await liveDb.run(
    sql`INSERT INTO ${schema.habits} ("id", "userId", "name", "period", "frequency", "createdAt", "updatedAt")
      VALUES (${habitId}, ${userId}, ${'Test Habit'}, ${'daily'}, ${1}, ${'2026-01-01T00:00:00.000Z'}, ${'2026-01-01T00:00:00.000Z'})`
  )
}

async function insertCheckin(id: string, date: string) {
  await liveDb.run(
    sql`INSERT INTO ${schema.checkins} ("id", "habitId", "date", "createdAt")
      VALUES (${id}, ${habitId}, ${date}, ${`${date}T00:00:00.000Z`})`
  )
}

async function selectDates(): Promise<string[]> {
  const rows = await liveDb.all<{ date: string }>(
    sql`SELECT ${schema.checkins.date} AS date FROM ${schema.checkins} ORDER BY ${schema.checkins.date}`
  )
  return rows.map((row) => row.date)
}

describe('resetHabitProgressAction (real SQLite)', () => {
  beforeEach(async () => {
    rebuildDb()
    vi.clearAllMocks()
    vi.mocked(getServerDateKey).mockResolvedValue(todayKey)
    vi.mocked(syncUser).mockResolvedValue({
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      dayStartHour: 24,
      email: `${userId}@example.com`,
      externalId: `access_${userId}`,
      id: userId,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      weekStart: 'monday',
    })
    await seedHabit()
    await insertCheckin('today-checkin', todayKey)
  })

  it.each([
    ['daily', '2026-08-12'],
    ['weekly', '2026-08-12'],
    ['monthly', '2026-08-01'],
  ] as const)('%s習慣は今日のチェックインだけ削除し、過去日のチェックインを残す', async (period, pastDate) => {
    vi.mocked(getHabitById).mockResolvedValue(buildHabit(period))
    await insertCheckin('past-checkin', pastDate)

    const result = await resetHabitProgressAction(habitId)

    expect(result.ok).toBe(true)
    expect(await selectDates()).toEqual([pastDate])
  })
})
