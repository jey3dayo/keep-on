import { eq } from 'drizzle-orm'
import * as v from 'valibot'
import { DEFAULT_WEEK_START, type WeekStart } from '@/constants/habit'
import { DEFAULT_COLOR_THEME, DEFAULT_THEME_MODE } from '@/constants/theme'
import { userSettings, users } from '@/db/schema'
import { invalidateUserCache } from '@/lib/cache/user-cache'
import { getDb } from '@/lib/db'
import { profileQuery } from '@/lib/queries/profiler'
import { type UpdateUserSettingsSchemaType, UserSettingsSchema } from '@/schemas/user-settings'
import type { UserSettings } from '@/types/user-settings'

/**
 * users.weekStart を更新（リトライ機構付き）
 *
 * @param userId - ユーザーID
 * @param weekStart - 新しいweekStart値（"monday" | "sunday"）
 * @param maxRetries - 最大リトライ回数（デフォルト: 3）
 * @returns clerkId または null
 * @throws Error 更新に失敗した場合
 */
async function updateUsersWeekStartWithRetry(
  userId: string,
  weekStart: WeekStart,
  maxRetries = 3
): Promise<string | null> {
  const db = getDb()
  let retryCount = 0

  while (retryCount < maxRetries) {
    try {
      const [user] = await db.update(users).set({ weekStart }).where(eq(users.id, userId)).returning()

      // User not found is not a transient error - fail immediately without retry
      if (!user) {
        throw new Error(`User not found: ${userId}`)
      }

      return user.clerkId ?? null
    } catch (error) {
      // Don't retry non-transient errors (user existence, validation errors, etc.)
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('User not found')) {
        console.error('updateUsersWeekStartWithRetry: non-retryable error', { userId, error: errorMessage })
        throw error
      }

      retryCount++
      console.error(`updateUsersWeekStartWithRetry: attempt ${retryCount}/${maxRetries} failed`, {
        userId,
        weekStart,
        error: errorMessage,
      })

      if (retryCount >= maxRetries) {
        throw error
      }

      // Exponential backoff: 100ms, 200ms, 400ms
      await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** retryCount))
    }
  }

  throw new Error('Unexpected: retry loop exited without success or error')
}

/**
 * userSettings をロールバック（復元または削除）
 *
 * @param userId - ユーザーID
 * @param settingsId - 設定のID
 * @param previousSettings - ロールバック前の設定（null = 新規作成だった）
 * @throws Error ロールバックに失敗した場合
 */
async function rollbackUserSettings(
  userId: string,
  settingsId: string,
  previousSettings: typeof userSettings.$inferSelect | null
): Promise<void> {
  const db = getDb()

  try {
    if (previousSettings) {
      // UPDATE case: restore previous values
      await db
        .update(userSettings)
        .set({
          weekStart: previousSettings.weekStart,
          colorTheme: previousSettings.colorTheme,
          themeMode: previousSettings.themeMode,
          updatedAt: previousSettings.updatedAt,
        })
        .where(eq(userSettings.id, settingsId))

      console.error('rollbackUserSettings: restored previous settings', { userId, settingsId })
    } else {
      // INSERT case: delete the newly created record
      await db.delete(userSettings).where(eq(userSettings.id, settingsId))
      console.error('rollbackUserSettings: deleted newly created settings', { userId, settingsId })
    }
  } catch (rollbackError) {
    console.error('rollbackUserSettings: rollback failed - manual intervention required', {
      userId,
      settingsId,
      hadPreviousSettings: !!previousSettings,
      rollbackError: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
    })
    throw new Error('Critical: Failed to rollback userSettings. Manual database intervention required.')
  }
}

/**
 * userSettings を upsert
 *
 * @param userId - ユーザーID
 * @param settings - 更新する設定
 * @param now - 現在のタイムスタンプ
 * @returns { nextSettings, previousSettings } - upsert後の設定と、更新前の設定（新規作成の場合はnull）
 */
async function upsertUserSettings(
  userId: string,
  settings: UpdateUserSettingsSchemaType,
  now: string
): Promise<{
  nextSettings: typeof userSettings.$inferSelect
  previousSettings: typeof userSettings.$inferSelect | null
}> {
  const db = getDb()

  // Get existing settings before upsert (for rollback)
  const [existing] = await db.select().from(userSettings).where(eq(userSettings.userId, userId))

  const [nextSettings] = await db
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

  if (!nextSettings) {
    throw new Error('Failed to update user settings')
  }

  return { nextSettings, previousSettings: existing ?? null }
}

/**
 * users.weekStart を更新してキャッシュを無効化
 *
 * @param userId - ユーザーID
 * @param settingsId - userSettings のID（ロールバック用）
 * @param weekStart - 新しいweekStart値（"monday" | "sunday"）
 * @param previousSettings - ロールバック用の以前の設定（null = 新規作成）
 * @returns clerkId または null
 */
async function updateWeekStartAndCache(
  userId: string,
  settingsId: string,
  weekStart: WeekStart,
  previousSettings: typeof userSettings.$inferSelect | null
): Promise<string | null> {
  try {
    const clerkId = await updateUsersWeekStartWithRetry(userId, weekStart)

    if (clerkId) {
      try {
        await invalidateUserCache(clerkId)
      } catch (cacheError) {
        // Cache invalidation failure is non-critical; log but don't fail the operation
        console.warn('updateWeekStartAndCache: cache invalidation failed (non-critical)', {
          userId,
          clerkId,
          error: cacheError instanceof Error ? cacheError.message : String(cacheError),
        })
      }
    }

    return clerkId
  } catch {
    console.error('updateWeekStartAndCache: users.weekStart update failed, rolling back', {
      userId,
      settingsId,
    })
    await rollbackUserSettings(userId, settingsId, previousSettings)
    throw new Error('Failed to update users.weekStart. Settings have been rolled back.')
  }
}

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

      const parsed = v.safeParse(UserSettingsSchema, settings)
      if (!parsed.success) {
        console.error('Invalid user settings:', parsed.issues)
        return undefined
      }

      return parsed.output
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
        .onConflictDoNothing({ target: userSettings.userId })
        .returning()

      const resolved = created ?? (await db.select().from(userSettings).where(eq(userSettings.userId, userId)))[0]

      if (!resolved) {
        throw new Error('Failed to create or fetch user settings')
      }

      const parsed = v.safeParse(UserSettingsSchema, resolved)
      if (!parsed.success) {
        throw new Error('Failed to create user settings: invalid data')
      }

      return parsed.output
    },
    { userId, defaults }
  )
}

/**
 * ユーザー設定を更新または作成（upsert）
 *
 * D1制約によりトランザクションが使えないため、順次実行パターンを採用。
 * 部分的失敗時のロールバック機構とリトライ機構を実装して一貫性を保証。
 *
 * @param userId - ユーザーID
 * @param settings - 更新する設定（部分更新）
 * @returns 更新されたユーザー設定
 * @throws Error 設定更新に失敗した場合（ロールバック済み）
 */
export async function updateUserSettings(
  userId: string,
  settings: UpdateUserSettingsSchemaType
): Promise<UserSettings> {
  return await profileQuery(
    'query.updateUserSettings',
    async () => {
      const now = new Date().toISOString()

      try {
        // Phase 1: Upsert user settings (returns both next and previous settings for rollback)
        const { nextSettings, previousSettings } = await upsertUserSettings(userId, settings, now)

        // Phase 2: Update weekStart in users table if provided (with retry, rollback, and cache invalidation)
        if (settings.weekStart !== undefined) {
          await updateWeekStartAndCache(userId, nextSettings.id, settings.weekStart, previousSettings)
        }

        // Phase 3: Validate settings
        const parsed = v.safeParse(UserSettingsSchema, nextSettings)
        if (!parsed.success) {
          console.error('updateUserSettings: validation failed', {
            userId,
            issues: parsed.issues,
          })
          throw new Error('Failed to update user settings: invalid data')
        }

        return parsed.output
      } catch (error) {
        // Enhanced error logging for monitoring and debugging
        console.error('updateUserSettings: operation failed', {
          userId,
          settings,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })

        throw error
      }
    },
    { userId, settings }
  )
}
