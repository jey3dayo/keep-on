import { eq } from 'drizzle-orm'
import { userSettings } from '@/db/schema'
import { getDb } from '@/lib/db'
import { profileQuery } from '@/lib/queries/profiler'
import type { UpdateUserSettingsSchemaType } from '@/schemas/user-settings'
import type { UserSettings } from '@/types/user-settings'

/**
 * ユーザー設定を取得
 *
 * @param userId - ユーザーID
 * @returns ユーザー設定または undefined
 */
export async function getUserSettings(userId: string): Promise<UserSettings | undefined> {
  return await profileQuery(
    'query.getUserSettings',
    async () => {
      const db = getDb()
      const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId))

      if (!settings) {
        return undefined
      }

      return {
        ...settings,
        createdAt: new Date(settings.createdAt),
        updatedAt: new Date(settings.updatedAt),
      } as UserSettings
    },
    { userId }
  )
}

/**
 * ユーザー設定を取得または作成
 *
 * @param userId - ユーザーID
 * @param defaults - デフォルト値（省略可）
 * @returns ユーザー設定
 */
export async function getOrCreateUserSettings(
  userId: string,
  defaults?: Partial<Omit<UserSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<UserSettings> {
  return await profileQuery(
    'query.getOrCreateUserSettings',
    async () => {
      const existing = await getUserSettings(userId)
      if (existing) {
        return existing
      }

      const db = getDb()
      const [created] = await db
        .insert(userSettings)
        .values({
          userId,
          weekStart: defaults?.weekStart,
          colorTheme: defaults?.colorTheme,
          themeMode: defaults?.themeMode,
        })
        .returning()

      return {
        ...created,
        createdAt: new Date(created.createdAt),
        updatedAt: new Date(created.updatedAt),
      } as UserSettings
    },
    { userId, defaults }
  )
}

/**
 * ユーザー設定を更新
 *
 * @param userId - ユーザーID
 * @param settings - 更新する設定（部分更新）
 * @returns 更新されたユーザー設定
 */
export async function updateUserSettings(
  userId: string,
  settings: UpdateUserSettingsSchemaType
): Promise<UserSettings> {
  return await profileQuery(
    'query.updateUserSettings',
    async () => {
      const db = getDb()
      const [updated] = await db
        .update(userSettings)
        .set({
          ...settings,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userSettings.userId, userId))
        .returning()

      return {
        ...updated,
        createdAt: new Date(updated.createdAt),
        updatedAt: new Date(updated.updatedAt),
      } as UserSettings
    },
    { userId, settings }
  )
}
