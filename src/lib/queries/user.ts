import { prisma } from '@/lib/db'

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
  return await prisma.user.upsert({
    where: { clerkId: input.clerkId },
    update: {
      email: input.email,
      updatedAt: new Date(),
    },
    create: {
      clerkId: input.clerkId,
      email: input.email,
    },
  })
}
