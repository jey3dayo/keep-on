import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as schema from '@/db/schema'
import { createSqliteD1 } from './helpers/sqlite-d1'

/**
 * `drizzle-orm` をモックせず、実 SQLite に対して user.ts のクエリを実行して検証する。
 *
 * upsert の `ON CONFLICT` 対象が実際の unique 制約（User_externalId_unique）へ解決されるか、
 * および email 引き当てによる externalId 張り替え（Clerk → Access の移行パス）が
 * users.id を保つかは、モックされた Drizzle では一切検証されない。
 */

type DrizzleD1Db = ReturnType<typeof drizzle<typeof schema>>

let liveDb: DrizzleD1Db

vi.mock('@/lib/db', () => ({
  getDb: () => liveDb,
}))

const { claimUserByEmail, getUserByExternalId, upsertUser } = await import('../user')

const MIGRATIONS_DIR = join(import.meta.dirname, '../../../../drizzle')
const MIGRATION_FILES = [
  '0000_adorable_impossible_man.sql',
  '0001_happy_prowler.sql',
  '0002_small_magus.sql',
  '0003_skip_and_reminder.sql',
  '0004_external_id.sql',
]

beforeEach(() => {
  const { d1, sqlite } = createSqliteD1()
  for (const file of MIGRATION_FILES) {
    const statements = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8')
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0)
    for (const statement of statements) {
      sqlite.exec(statement)
    }
  }
  liveDb = drizzle(d1, { schema })
})

describe('upsertUser (real SQLite)', () => {
  it('同じ externalId の再 upsert は行を増やさず email を更新する', async () => {
    const created = await upsertUser({ email: 'first@example.com', externalId: 'access-sub-1' })
    const updated = await upsertUser({ email: 'second@example.com', externalId: 'access-sub-1' })

    // ON CONFLICT の対象が実在の unique 制約に解決されていることの確認
    expect(updated.id).toBe(created.id)
    expect(updated.email).toBe('second@example.com')
    expect(await liveDb.select().from(schema.users)).toHaveLength(1)
  })
})

describe('claimUserByEmail (real SQLite)', () => {
  it('Clerk ID の行を email で引き当てて externalId を張り替え、users.id を保つ', async () => {
    const legacy = await upsertUser({ email: 'user@example.com', externalId: 'clerk_legacy' })

    const claimed = await claimUserByEmail('user@example.com', 'access-sub-1')

    // users.id が保たれることが移行の要件（habits / checkins の外部キーが users.id を参照する）
    expect(claimed?.id).toBe(legacy.id)
    expect(claimed?.externalId).toBe('access-sub-1')
    expect(await getUserByExternalId('access-sub-1')).toMatchObject({ id: legacy.id })
    expect(await getUserByExternalId('clerk_legacy')).toBeNull()
  })

  it('該当する email が無い場合は null を返す', async () => {
    expect(await claimUserByEmail('missing@example.com', 'access-sub-1')).toBeNull()
  })
})
