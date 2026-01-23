import { currentUser } from '@clerk/nextjs/server'
import { upsertUser } from './queries/user'

/**
 * Clerk認証されたユーザーをPrismaのUserテーブルに同期
 * 存在しない場合は新規作成、存在する場合は更新
 */
export async function syncUser() {
  const clerkUser = await currentUser()

  if (!clerkUser) {
    return null
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress
  if (!email) {
    throw new Error('Email address not found')
  }

  // ユーザーを取得または作成
  return await upsertUser({
    clerkId: clerkUser.id,
    email,
  })
}

/**
 * 現在のユーザーのIDを取得（Prisma User ID）
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await syncUser()
  return user?.id ?? null
}
