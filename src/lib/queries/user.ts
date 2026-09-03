import { eq } from 'drizzle-orm'
import { DEFAULT_WEEK_START, type WeekStart } from '@/constants/habit'
import { users } from '@/db/schema'
import { getDb } from '@/lib/db'
import { profileQuery } from '@/lib/queries/profiler'

/** User テーブルの1行 */
export type UserRow = typeof users.$inferSelect

/**
 * ユーザーのupsert入力データ
 */
export interface UpsertUserInput {
  email: string
  externalId: string
}

/**
 * ユーザーをupsert（存在しない場合は作成、存在する場合は更新）
 *
 * conflict target は externalId のみ。email の unique 衝突（IdP 移行で同じ
 * メールアドレスに別の externalId が発行されたケース）は claimUserByEmail で解決する。
 *
 * @param input - ユーザーの入力データ
 * @returns upsertされたユーザー
 */
export async function upsertUser(input: UpsertUserInput) {
  return await profileQuery(
    'query.upsertUser',
    async () => {
      const db = getDb()
      const [user] = await db
        .insert(users)
        .values({
          email: input.email,
          externalId: input.externalId,
        })
        .onConflictDoUpdate({
          set: {
            email: input.email,
            updatedAt: new Date().toISOString(),
          },
          target: users.externalId,
        })
        .returning()
      return user
    },
    { externalId: input.externalId }
  )
}

/**
 * メールアドレスで既存ユーザーを引き当て、externalId を新しい値へ張り替える
 *
 * identity の正キーは email。IdP 移行で sub が変わっても、同じ email の行を
 * 引き継ぐことで habits / checkins の紐付け（users.id）を保つ。
 *
 * @param email - メールアドレス
 * @param externalId - 新しい外部 IdP のサブジェクト識別子
 * @returns 更新されたユーザーまたは null（該当行なし）
 */
export async function claimUserByEmail(email: string, externalId: string): Promise<UserRow | null> {
  return await profileQuery(
    'query.claimUserByEmail',
    async () => {
      const db = getDb()
      const [user] = await db
        .update(users)
        .set({ externalId, updatedAt: new Date().toISOString() })
        .where(eq(users.email, email))
        .returning()
      return user ?? null
    },
    { externalId }
  )
}

/**
 * 外部 IdP のサブジェクト識別子でユーザーを取得
 *
 * @param externalId - 外部 IdP のサブジェクト識別子
 * @returns ユーザーまたは null
 */
export async function getUserByExternalId(externalId: string): Promise<UserRow | null> {
  return await profileQuery(
    'query.getUserByExternalId',
    async () => {
      const db = getDb()
      const [user] = await db.select().from(users).where(eq(users.externalId, externalId))
      return user ?? null
    },
    { externalId }
  )
}

/**
 * ユーザーの週開始日設定を取得
 *
 * @param externalId - 外部 IdP のサブジェクト識別子
 * @returns 週開始日設定 ('monday' | 'sunday')
 */
export async function getUserWeekStart(externalId: string): Promise<WeekStart> {
  return await profileQuery(
    'query.getUserWeekStart',
    async () => {
      const db = getDb()
      const [user] = await db.select({ weekStart: users.weekStart }).from(users).where(eq(users.externalId, externalId))
      return (user?.weekStart as WeekStart) ?? DEFAULT_WEEK_START
    },
    { externalId }
  )
}
