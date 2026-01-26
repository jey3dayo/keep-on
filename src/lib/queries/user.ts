import { eq } from 'drizzle-orm'
import type { WeekStart } from '@/constants/habit'
import { users } from '@/db/schema'
import { getDb } from '@/lib/db'

/**
 * ユーザーのupsert入力データ
 */
export interface UpsertUserInput {
  clerkId: string
  email: string
}

/**
 * ユーザーをupsert（存在しない場合は作成、存在する場合は更新）
 *
 * @param input - ユーザーの入力データ
 * @returns upsertされたユーザー
 */
export async function upsertUser(input: UpsertUserInput) {
  const db = await getDb()
  const [user] = await db
    .insert(users)
    .values({
      clerkId: input.clerkId,
      email: input.email,
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email: input.email,
        updatedAt: new Date(),
      },
    })
    .returning()
  return user
}

/**
 * ユーザーの週開始日設定を取得
 *
 * @param clerkId - ClerkのユーザーID
 * @returns 週開始日設定 ('monday' | 'sunday')
 */
export async function getUserWeekStart(clerkId: string): Promise<WeekStart> {
  const db = await getDb()
  const [user] = await db.select({ weekStart: users.weekStart }).from(users).where(eq(users.clerkId, clerkId))
  return (user?.weekStart as WeekStart) ?? 'monday'
}

/**
 * ユーザーの週開始日設定を更新
 *
 * @param clerkId - ClerkのユーザーID
 * @param weekStart - 週開始日 ('monday' | 'sunday')
 * @returns 更新されたユーザー
 */
export async function updateUserWeekStart(clerkId: string, weekStart: WeekStart) {
  const db = await getDb()
  const [user] = await db.update(users).set({ weekStart }).where(eq(users.clerkId, clerkId)).returning()
  return user
}
