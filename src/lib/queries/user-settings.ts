import { eq } from 'drizzle-orm'
import * as v from 'valibot'
import { DEFAULT_DAY_START_HOUR, DEFAULT_WEEK_START } from '@/constants/habit'
import { DEFAULT_COLOR_THEME, DEFAULT_THEME_MODE } from '@/constants/theme'
import { userSettings, users } from '@/db/schema'
import { invalidateAnalyticsCache } from '@/lib/cache/analytics-cache'
import { invalidateHabitsCache } from '@/lib/cache/habit-cache'
import { invalidateUserCache } from '@/lib/cache/user-cache'
import { getDb } from '@/lib/db'
import { profileQuery } from '@/lib/queries/profiler'
import { captureException } from '@/lib/sentry'
import { type UpdateUserSettingsSchemaType, UserSettingsSchema } from '@/schemas/user-settings'
import type { UserSettings } from '@/types/user-settings'

/**
 * users テーブルへ複製している設定列（weekStart / dayStartHour）の部分集合。
 *
 * userSettings が正本だが、habits クエリの dateKey 計算がこれらの列を直接参照するため
 * users 側にも複製している。両方を1回の呼び出しで更新できるよう patch 形式にしている。
 */
type UsersMirroredSettings = Partial<Pick<typeof users.$inferInsert, 'weekStart' | 'dayStartHour'>>

/**
 * users の複製列（weekStart / dayStartHour）を更新（リトライ機構付き）
 *
 * @param userId - ユーザーID
 * @param patch - 更新する列と値（weekStart / dayStartHour のいずれか、または両方）
 * @param maxRetries - 最大リトライ回数（デフォルト: 3）
 * @returns externalId または null
 * @throws Error 更新に失敗した場合
 */
async function updateUsersMirroredSettingsWithRetry(
  userId: string,
  patch: UsersMirroredSettings,
  maxRetries = 3
): Promise<string | null> {
  const db = getDb()
  let retryCount = 0

  while (retryCount < maxRetries) {
    try {
      const [user] = await db.update(users).set(patch).where(eq(users.id, userId)).returning()

      // User not found is not a transient error - fail immediately without retry
      if (!user) {
        throw new Error(`User not found: ${userId}`)
      }

      return user.externalId ?? null
    } catch (error) {
      // Don't retry non-transient errors (user existence, validation errors, etc.)
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('User not found')) {
        console.error('updateUsersMirroredSettingsWithRetry: non-retryable error', {
          error: errorMessage,
          patch,
          userId,
        })
        throw error
      }

      retryCount++
      console.error(`updateUsersMirroredSettingsWithRetry: attempt ${retryCount}/${maxRetries} failed`, {
        error: errorMessage,
        patch,
        userId,
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
          colorTheme: previousSettings.colorTheme,
          dayStartHour: previousSettings.dayStartHour,
          themeMode: previousSettings.themeMode,
          updatedAt: previousSettings.updatedAt,
          weekStart: previousSettings.weekStart,
        })
        .where(eq(userSettings.id, settingsId))

      console.error('rollbackUserSettings: restored previous settings', { settingsId, userId })
    } else {
      // INSERT case: delete the newly created record
      await db.delete(userSettings).where(eq(userSettings.id, settingsId))
      console.error('rollbackUserSettings: deleted newly created settings', { settingsId, userId })
    }
  } catch (rollbackError) {
    console.error('rollbackUserSettings: rollback failed - manual intervention required', {
      hadPreviousSettings: !!previousSettings,
      rollbackError: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
      settingsId,
      userId,
    })
    throw new Error('Critical: Failed to rollback userSettings. Manual database intervention required.', {
      cause: rollbackError,
    })
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
      colorTheme: settings.colorTheme ?? DEFAULT_COLOR_THEME,
      createdAt: now,
      dayStartHour: settings.dayStartHour ?? DEFAULT_DAY_START_HOUR,
      themeMode: settings.themeMode ?? DEFAULT_THEME_MODE,
      updatedAt: now,
      userId,
      weekStart: settings.weekStart ?? DEFAULT_WEEK_START,
    })
    .onConflictDoUpdate({
      // id / userId / createdAt は絶対に更新しない（mass assignment 防止のためキー名はリテラルで列挙）
      set: {
        ...(settings.colorTheme === undefined ? {} : { colorTheme: settings.colorTheme }),
        ...(settings.dayStartHour === undefined ? {} : { dayStartHour: settings.dayStartHour }),
        ...(settings.themeMode === undefined ? {} : { themeMode: settings.themeMode }),
        ...(settings.weekStart === undefined ? {} : { weekStart: settings.weekStart }),
        updatedAt: now,
      },
      target: userSettings.userId,
    })
    .returning()

  if (!nextSettings) {
    throw new Error('Failed to update user settings')
  }

  return { nextSettings, previousSettings: existing ?? null }
}

/**
 * users の複製列（weekStart / dayStartHour）を更新してキャッシュを無効化
 *
 * どちらの列が変わっても `habits:user:{userId}` に保存された dateKey の前提が変わるため、
 * 変更対象列によらず同じ無効化対象（habits / analytics / user）を無効化する。
 *
 * @param userId - ユーザーID
 * @param settingsId - userSettings のID（ロールバック用）
 * @param patch - users へ書き込む列と値（weekStart / dayStartHour のいずれか、または両方）
 * @param previousSettings - ロールバック用の以前の設定（null = 新規作成）
 * @returns externalId または null
 */
async function updateUsersMirroredSettingsAndCache(
  userId: string,
  settingsId: string,
  patch: UsersMirroredSettings,
  previousSettings: typeof userSettings.$inferSelect | null
): Promise<string | null> {
  try {
    const externalId = await updateUsersMirroredSettingsWithRetry(userId, patch)

    try {
      await Promise.all([
        externalId ? invalidateUserCache(externalId) : Promise.resolve(),
        invalidateHabitsCache(userId),
        invalidateAnalyticsCache(userId),
      ])
    } catch (cacheError) {
      // Cache invalidation failure is non-critical; log but don't fail the operation
      console.warn('updateUsersMirroredSettingsAndCache: cache invalidation failed (non-critical)', {
        error: cacheError instanceof Error ? cacheError.message : String(cacheError),
        externalId,
        userId,
      })
      captureException(cacheError, {
        externalId,
        operation: 'updateUsersMirroredSettingsAndCache.invalidateCaches',
        userId,
      })
    }

    return externalId
  } catch (error) {
    const columns = Object.keys(patch)
    const columnLabel = columns.length === 1 ? columns[0] : `{${columns.join(', ')}}`
    console.error('updateUsersMirroredSettingsAndCache: users update failed, rolling back', {
      columns,
      settingsId,
      userId,
    })
    // ここでは Sentry へ送らない。この throw は updateUserSettingsAction の catch で
    // 必ず捕捉されて送信され、元エラーは cause 経由で linkedErrors が紐づけるため。
    await rollbackUserSettings(userId, settingsId, previousSettings)
    throw new Error(`Failed to update users.${columnLabel}. Settings have been rolled back.`, { cause: error })
  }
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

        // Phase 2: Mirror weekStart / dayStartHour into users if provided (single UPDATE, retry, rollback, cache invalidation)
        const mirroredPatch: UsersMirroredSettings = {}
        if (settings.weekStart !== undefined) {
          mirroredPatch.weekStart = settings.weekStart
        }
        if (settings.dayStartHour !== undefined) {
          mirroredPatch.dayStartHour = settings.dayStartHour
        }
        if (Object.keys(mirroredPatch).length > 0) {
          await updateUsersMirroredSettingsAndCache(userId, nextSettings.id, mirroredPatch, previousSettings)
        }

        // Phase 3: Validate settings
        const parsed = v.safeParse(UserSettingsSchema, nextSettings)
        if (!parsed.success) {
          console.error('updateUserSettings: validation failed', {
            issues: parsed.issues,
            userId,
          })
          throw new Error('Failed to update user settings: invalid data')
        }

        return parsed.output
      } catch (error) {
        // Enhanced error logging for monitoring and debugging
        console.error('updateUserSettings: operation failed', {
          error: error instanceof Error ? error.message : String(error),
          settings,
          stack: error instanceof Error ? error.stack : undefined,
          userId,
        })

        throw error
      }
    },
    { settings, userId }
  )
}
