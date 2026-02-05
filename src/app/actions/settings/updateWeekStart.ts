'use server'

import type { WeekStart } from '@/constants/habit'
import type { ServerActionResultAsync } from '@/lib/actions/result'
import type { SerializableSettingsError } from '@/lib/errors/settings'
import { updateUserSettingsAction } from './updateUserSettings'

/**
 * 週の開始日を更新（updateUserSettingsAction のラッパー）
 *
 * @param weekStart - 週の開始日 ('monday' | 'sunday')
 * @returns 更新結果
 */
export async function updateWeekStartAction(
  weekStart: WeekStart
): ServerActionResultAsync<void, SerializableSettingsError> {
  const result = await updateUserSettingsAction({ weekStart })

  if (result.ok) {
    return { ok: true, data: undefined }
  }

  return result
}
