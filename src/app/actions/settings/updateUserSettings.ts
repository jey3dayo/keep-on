'use server'

import { revalidatePath } from 'next/cache'
import * as v from 'valibot'
import { actionError, actionOk, type ServerActionResultAsync } from '@/lib/actions/result'
import type { SerializableSettingsError } from '@/lib/errors/settings'
import { updateUserSettings } from '@/lib/queries/user-settings'
import { captureException } from '@/lib/sentry'
import { getCurrentUserId } from '@/lib/user'
import { UpdateUserSettingsSchema } from '@/schemas/user-settings'
import type { UserSettings } from '@/types/user-settings'

export async function updateUserSettingsAction(
  settings: unknown
): ServerActionResultAsync<UserSettings, SerializableSettingsError> {
  const userId = await getCurrentUserId()

  if (!userId) {
    return actionError({ message: 'Unauthorized', name: 'UnauthorizedError' })
  }

  // Server Action の引数は実行時には任意の JSON。境界で検証し、余分なキーを落とす
  const parseResult = v.safeParse(UpdateUserSettingsSchema, settings)

  if (!parseResult.success) {
    return actionError({ message: '設定の入力値が不正です', name: 'ValidationError' })
  }

  try {
    // 設定を更新または作成（upsert）
    const updated = await updateUserSettings(userId, parseResult.output)

    revalidatePath('/dashboard')
    revalidatePath('/settings')
    revalidatePath('/habits')
    revalidatePath('/analytics')

    return actionOk(updated)
  } catch (error) {
    console.error('Failed to update user settings', error)
    captureException(error, { operation: 'updateUserSettingsAction', userId })
    return actionError({ message: 'ユーザー設定の更新に失敗しました', name: 'DatabaseError' })
  }
}
