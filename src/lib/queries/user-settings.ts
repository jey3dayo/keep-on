import { eq } from 'drizzle-orm'
import { DEFAULT_WEEK_START } from '@/constants/habit'
import { DEFAULT_COLOR_THEME, DEFAULT_THEME_MODE } from '@/constants/theme'
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

      return settings as UserSettings
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
          weekStart: defaults?.weekStart ?? DEFAULT_WEEK_START,
          colorTheme: defaults?.colorTheme ?? DEFAULT_COLOR_THEME,
          themeMode: defaults?.themeMode ?? DEFAULT_THEME_MODE,
        })
        .returning()

      return created as UserSettings
    },
    { userId, defaults }
  )
}

/**
 * ユーザー設定を更新または作成（upsert）
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
      const now = new Date().toISOString()

      const [upserted] = await db
        .insert(userSettings)
        .values({
          userId,
          weekStart: settings.weekStart ?? DEFAULT_WEEK_START,
          colorTheme: settings.colorTheme ?? DEFAULT_COLOR_THEME,
          themeMode: settings.themeMode ?? DEFAULT_THEME_MODE,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: {
            ...settings,
            updatedAt: now,
          },
        })
        .returning()

      return upserted as UserSettings
    },
    { userId, settings }
  )
}
