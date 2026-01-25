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
  const now = new Date()
  const [user] = await db
    .insert(users)
    .values({
      clerkId: input.clerkId,
      email: input.email,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email: input.email,
        updatedAt: now,
      },
    })
    .returning()
  return user
}
