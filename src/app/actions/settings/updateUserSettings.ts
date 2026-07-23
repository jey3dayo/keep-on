'use server'

import { revalidatePath } from 'next/cache'
import { actionError, actionOk, type ServerActionResultAsync } from '@/lib/actions/result'
import type { SerializableSettingsError } from '@/lib/errors/settings'
import { updateUserSettings } from '@/lib/queries/user-settings'
import { getCurrentUserId } from '@/lib/user'
import type { UpdateUserSettingsSchemaType } from '@/schemas/user-settings'
import type { UserSettings } from '@/types/user-settings'

export async function updateUserSettingsAction(
  settings: UpdateUserSettingsSchemaType
): ServerActionResultAsync<UserSettings, SerializableSettingsError> {
  const userId = await getCurrentUserId()

  if (!userId) {
    return actionError({ message: 'Unauthorized', name: 'UnauthorizedError' })
  }

  try {
    // 設定を更新または作成（upsert）
    const updated = await updateUserSettings(userId, settings)

    revalidatePath('/dashboard')
    revalidatePath('/settings')

    return actionOk(updated)
  } catch (error) {
    console.error('Failed to update user settings', error)
    return actionError({ message: 'ユーザー設定の更新に失敗しました', name: 'DatabaseError' })
  }
}
