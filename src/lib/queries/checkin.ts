import { createId } from '@paralleldrive/cuid2'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import type { Period, WeekStartDay } from '@/constants/habit'
import { checkins, habits } from '@/db/schema'
import { getDb } from '@/lib/db'
import { getPeriodDateRange } from '@/lib/queries/period'
import { profileQuery } from '@/lib/queries/profiler'
import { normalizeDateKey } from '@/lib/utils/date'

interface CreateCheckinInput {
  date: Date | string
  habitId: string
}

interface CreateCheckinWithLimitInput {
  date: Date | string
  frequency: number
  habitId: string
  period: Period
  weekStartDay?: WeekStartDay
}

/**
 * チェックイン作成結果
 *
 * @property created - チェックインが作成されたかどうか（頻度上限に達している場合はfalse）
 * @property currentCount - 期間内の現在のチェックイン数
 * @property checkin - 作成されたチェックインレコード（失敗時はnull）
 */
export interface CreateCheckinWithLimitResult {
  checkin: typeof checkins.$inferSelect | null
  created: boolean
  currentCount: number
}

export async function getCheckinsByUserAndDate(userId: string, date: Date | string) {
  return await profileQuery(
    'query.getCheckinsByUserAndDate',
    async () => {
      const db = getDb()
      const dateKey = normalizeDateKey(date)

      const result = await db
        .select()
        .from(checkins)
        .innerJoin(habits, eq(checkins.habitId, habits.id))
        .where(and(eq(habits.userId, userId), eq(checkins.date, dateKey)))

      return result.map((row) => row.Checkin)
    },
    { userId, date: normalizeDateKey(date) }
  )
}

export async function createCheckin(input: CreateCheckinInput) {
  return await profileQuery(
    'query.createCheckin',
    async () => {
      const db = getDb()
      const dateKey = normalizeDateKey(input.date)

      const [checkin] = await db
        .insert(checkins)
        .values({
          habitId: input.habitId,
          date: dateKey,
        })
        .returning()

      return checkin ?? null
    },
    { habitId: input.habitId }
  )
}

const CHECKIN_COUNT_ALIAS = 'currentCheckinCount'

/**
 * `INSERT ... SELECT ... WHERE (count) < frequency RETURNING *` の1行を
 * `CreateCheckinWithLimitResult`（作成成功パス）へ変換する。
 *
 * RETURNING で返る行は D1 上は `Record<string, unknown>` 形状のため、
 * 型アサーションではなくフィールドごとの検証で `checkins.$inferSelect` を組み立てる。
 */
function parseInsertedCheckinRow(row: Record<string, unknown>): CreateCheckinWithLimitResult {
  const { id, habitId, date, createdAt } = row
  const currentCount = row[CHECKIN_COUNT_ALIAS]

  if (typeof id !== 'string' || typeof habitId !== 'string' || typeof date !== 'string') {
    throw new Error('Unexpected checkin insert row shape: missing string fields')
  }
  if (typeof createdAt !== 'string') {
    throw new Error('Unexpected checkin insert row shape: missing createdAt')
  }
  if (typeof currentCount !== 'number') {
    throw new Error('Unexpected checkin insert row shape: missing currentCheckinCount')
  }

  return {
    created: true,
    currentCount,
    checkin: { id, habitId, date, createdAt },
  }
}

export async function createCheckinWithLimit(
  input: CreateCheckinWithLimitInput
): Promise<CreateCheckinWithLimitResult> {
  return await profileQuery(
    'query.createCheckinWithLimit',
    async () => {
      const db = getDb()
      const dateKey = normalizeDateKey(input.date)
      const { startKey, endKey } = getPeriodDateRange(dateKey, input.period, input.weekStartDay ?? 1)
      const newId = createId()
      const createdAt = new Date().toISOString()

      // D1では通常のトランザクションAPIが使えず、同一日付の重複を防ぐUNIQUE制約も撤去済み（migration 0002）。
      // 頻度上限チェックを INSERT 文自身の WHERE 句（相関サブクエリ）に埋め込むことで、
      // 「カウント取得 → INSERT」の2往復・非アトミックな旧実装のレースを解消し、1往復に統合する。
      // RETURNING には INSERT 後の期間内カウントを相関サブクエリで同梱し、追加の往復を避ける。
      const insertedRows = await db.all<Record<string, unknown>>(sql`
        INSERT INTO ${checkins} (${checkins.id}, ${checkins.habitId}, ${checkins.date}, ${checkins.createdAt})
        SELECT ${newId}, ${input.habitId}, ${dateKey}, ${createdAt}
        WHERE (
          SELECT count(*) FROM ${checkins}
          WHERE ${checkins.habitId} = ${input.habitId} AND ${checkins.date} BETWEEN ${startKey} AND ${endKey}
        ) < ${input.frequency}
        RETURNING *, (
          SELECT count(*) FROM ${checkins}
          WHERE ${checkins.habitId} = ${input.habitId} AND ${checkins.date} BETWEEN ${startKey} AND ${endKey}
        ) AS ${sql.raw(CHECKIN_COUNT_ALIAS)}
      `)

      const [insertedRow] = insertedRows
      if (insertedRow) {
        return parseInsertedCheckinRow(insertedRow)
      }

      // 頻度上限に達していたため INSERT がスキップされたケース（低頻度パス）。
      // このときのみ現在カウントを取得するための追加の1往復を許容する。
      const countResult = await db
        .select({ count: sql<number>`CAST(count(*) AS INTEGER)` })
        .from(checkins)
        .where(and(eq(checkins.habitId, input.habitId), gte(checkins.date, startKey), lte(checkins.date, endKey)))

      const currentCount = countResult[0]?.count ?? 0
      return { created: false, currentCount, checkin: null }
    },
    { habitId: input.habitId, period: input.period }
  )
}

/**
 * 削除結果
 *
 * @property checkin - 削除されたチェックインレコード（削除対象なしの場合はnull）
 * @property currentCount - 削除後の期間内チェックイン数
 * @property deleted - チェックインが削除されたかどうか
 */
export interface DeleteLatestCheckinResult {
  checkin: typeof checkins.$inferSelect | null
  currentCount: number
  deleted: boolean
}

/**
 * 期間内の最新チェックインを削除し、削除後のカウントを返す
 *
 * `createCheckinWithLimit` と対称の設計: 削除前に期間内カウントを取得し、
 * 削除成功時はカウントを再取得せず `count - 1` を返すことで往復数を抑える。
 * 期間内にチェックインが存在しない場合は DELETE 自体を発行せず1往復で終える。
 */
export async function deleteLatestCheckinByHabitAndPeriod(
  habitId: string,
  date: Date | string,
  period: Period,
  weekStartDay: WeekStartDay = 1
): Promise<DeleteLatestCheckinResult> {
  return await profileQuery(
    'query.deleteLatestCheckinByHabitAndPeriod',
    async () => {
      const db = getDb()
      const { startKey, endKey } = getPeriodDateRange(date, period, weekStartDay)

      // 1. 削除前の期間内カウントを取得
      const countResult = await db
        .select({ count: sql<number>`CAST(count(*) AS INTEGER)` })
        .from(checkins)
        .where(and(eq(checkins.habitId, habitId), gte(checkins.date, startKey), lte(checkins.date, endKey)))

      const currentCount = countResult[0]?.count ?? 0

      // 2. 削除対象が存在しない場合はDELETEを発行せず早期リターン
      if (currentCount === 0) {
        return { deleted: false, currentCount: 0, checkin: null }
      }

      // 3. DELETE ... WHERE id = (期間内最新1件のサブクエリ) + RETURNING で select→delete の2往復を1往復に統合
      const [deleted] = await db
        .delete(checkins)
        .where(
          sql`${checkins.id} = (
            SELECT ${checkins.id} FROM ${checkins}
            WHERE ${checkins.habitId} = ${habitId} AND ${checkins.date} >= ${startKey} AND ${checkins.date} <= ${endKey}
            ORDER BY ${checkins.date} DESC, ${checkins.createdAt} DESC
            LIMIT 1
          )`
        )
        .returning()

      if (!deleted) {
        return { deleted: false, currentCount, checkin: null }
      }

      // 4. 削除成功後のカウントは事前チェック値から算出する（再カウントのD1往復を削減）
      return { deleted: true, currentCount: currentCount - 1, checkin: deleted }
    },
    { habitId, period }
  )
}

export async function deleteAllCheckinsByHabitAndPeriod(
  habitId: string,
  date: Date | string,
  period: Period,
  weekStartDay: WeekStartDay = 1
) {
  return await profileQuery(
    'query.deleteAllCheckinsByHabitAndPeriod',
    async () => {
      const db = getDb()
      const { startKey, endKey } = getPeriodDateRange(date, period, weekStartDay)

      const result = await db
        .delete(checkins)
        .where(and(eq(checkins.habitId, habitId), gte(checkins.date, startKey), lte(checkins.date, endKey)))

      return result
    },
    { habitId, period }
  )
}

export async function getTotalCheckinsByUserId(userId: string): Promise<number> {
  // KVキャッシュから取得を試行（TTL: 5分）
  const { getTotalCheckinsFromCache, setTotalCheckinsCache } = await import('@/lib/cache/analytics-cache')
  const cached = await getTotalCheckinsFromCache(userId)
  if (cached !== null) {
    return cached
  }

  // キャッシュミス - DB から取得
  return await profileQuery(
    'query.getTotalCheckinsByUserId',
    async () => {
      const db = getDb()
      const result = await db
        .select({ count: sql<number>`CAST(count(*) AS INTEGER)` })
        .from(checkins)
        .innerJoin(habits, eq(checkins.habitId, habits.id))
        .where(eq(habits.userId, userId))

      const total = result[0]?.count ?? 0

      // キャッシュに保存
      await setTotalCheckinsCache(userId, total)

      return total
    },
    { userId }
  )
}

export async function getCheckinCountsByDateRange(userId: string, startDateKey: string, endDateKey: string) {
  return await profileQuery(
    'query.getCheckinCountsByDateRange',
    async () => {
      const db = getDb()
      const results = await db
        .select({ date: checkins.date, count: sql<number>`CAST(count(*) AS INTEGER)` })
        .from(checkins)
        .innerJoin(habits, eq(checkins.habitId, habits.id))
        .where(and(eq(habits.userId, userId), gte(checkins.date, startDateKey), lte(checkins.date, endDateKey)))
        .groupBy(checkins.date)
        .orderBy(checkins.date)

      return results
    },
    { userId, startDateKey, endDateKey }
  )
}
