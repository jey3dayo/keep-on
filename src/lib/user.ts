import { currentUser } from '@clerk/nextjs/server'
import { prisma } from './db'

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
  const user = await prisma.user.upsert({
    where: { clerkId: clerkUser.id },
    update: {
      email,
      updatedAt: new Date(),
    },
    create: {
      clerkId: clerkUser.id,
      email,
    },
  })

  return user
}

/**
 * 現在のユーザーのIDを取得（Prisma User ID）
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await syncUser()
  return user?.id ?? null
}
