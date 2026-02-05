'use server'

import { revalidatePath } from 'next/cache'
import { actionError, actionOk, type ServerActionResultAsync } from '@/lib/actions/result'
import type { SerializableSettingsError } from '@/lib/errors/settings'
import { getOrCreateUserSettings, updateUserSettings } from '@/lib/queries/user-settings'
import { getCurrentUserId } from '@/lib/user'
import type { UpdateUserSettingsSchemaType } from '@/schemas/user-settings'
import type { UserSettings } from '@/types/user-settings'

export async function updateUserSettingsAction(
  settings: UpdateUserSettingsSchemaType
): ServerActionResultAsync<UserSettings, SerializableSettingsError> {
  const userId = await getCurrentUserId()

  if (!userId) {
    return actionError({ name: 'UnauthorizedError', message: 'Unauthorized' })
  }

  try {
    // ユーザー設定が存在しない場合は作成
    await getOrCreateUserSettings(userId)

    // 設定を更新
    const updated = await updateUserSettings(userId, settings)

    revalidatePath('/dashboard')
    revalidatePath('/settings')

    return actionOk(updated)
  } catch (error) {
    console.error('Failed to update user settings', error)
    return actionError({ name: 'DatabaseError', message: 'ユーザー設定の更新に失敗しました' })
  }
}
