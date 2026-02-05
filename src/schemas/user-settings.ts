import * as v from 'valibot'
import { COLOR_THEMES } from '@/constants/theme'

/**
 * ユーザー設定スキーマ（完全版）
 */
export const UserSettingsSchema = v.object({
  id: v.string(),
  userId: v.string(),
  weekStart: v.picklist(['monday', 'sunday']),
  colorTheme: v.picklist(COLOR_THEMES),
  themeMode: v.picklist(['light', 'dark', 'system']),
  createdAt: v.string(),
  updatedAt: v.string(),
})

export type UserSettingsSchemaType = v.InferOutput<typeof UserSettingsSchema>

/**
 * ユーザー設定更新スキーマ（部分更新用）
 */
export const UpdateUserSettingsSchema = v.partial(
  v.object({
    weekStart: v.picklist(['monday', 'sunday']),
    colorTheme: v.picklist(COLOR_THEMES),
    themeMode: v.picklist(['light', 'dark', 'system']),
  })
)

export type UpdateUserSettingsSchemaType = v.InferOutput<typeof UpdateUserSettingsSchema>
