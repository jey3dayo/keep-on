import * as v from 'valibot'
import { COLOR_THEMES } from '@/constants/theme'

/**
 * ユーザー設定スキーマ（完全版）
 */
export const UserSettingsSchema = v.object({
  colorTheme: v.picklist(COLOR_THEMES),
  createdAt: v.string(),
  id: v.string(),
  themeMode: v.picklist(['light', 'dark', 'system']),
  updatedAt: v.string(),
  userId: v.string(),
  weekStart: v.picklist(['monday', 'sunday']),
})

export type UserSettingsSchemaType = v.InferOutput<typeof UserSettingsSchema>

/**
 * ユーザー設定更新スキーマ（部分更新用）
 */
export const UpdateUserSettingsSchema = v.partial(
  v.object({
    colorTheme: v.picklist(COLOR_THEMES),
    themeMode: v.picklist(['light', 'dark', 'system']),
    weekStart: v.picklist(['monday', 'sunday']),
  })
)

export type UpdateUserSettingsSchemaType = v.InferOutput<typeof UpdateUserSettingsSchema>
