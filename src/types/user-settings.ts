import type { WeekStart } from '@/constants/habit'
import type { ColorThemeName } from '@/constants/theme'

export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * ユーザー設定型（Server Action の返り値用）
 * タイムスタンプは ISO 文字列として扱う
 */
export interface UserSettings {
  id: string
  userId: string
  weekStart: WeekStart
  colorTheme: ColorThemeName
  themeMode: ThemeMode
  createdAt: string
  updatedAt: string
}
