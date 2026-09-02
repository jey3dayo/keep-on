'use server'

import type { DayStartHour } from '@/constants/habit'
import type { ServerActionResultAsync } from '@/lib/actions/result'
import type { SerializableSettingsError } from '@/lib/errors/settings'
import { updateUserSettingsAction } from './updateUserSettings'

/**
 * 日付が切り替わる時刻を更新（updateUserSettingsAction のラッパー）
 *
 * @param dayStartHour - 日付が切り替わる時刻（24〜29）
 * @returns 更新結果
 */
export async function updateDayStartHourAction(
  dayStartHour: DayStartHour
): ServerActionResultAsync<void, SerializableSettingsError> {
  const result = await updateUserSettingsAction({ dayStartHour })

  if (result.ok) {
    return { data: undefined, ok: true }
  }

  return result
}
