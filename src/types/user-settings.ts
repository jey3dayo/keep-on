import type { WeekStart } from '@/constants/habit'
import type { ColorThemeName } from '@/constants/theme'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface UserSettings {
  id: string
  userId: string
  weekStart: WeekStart
  colorTheme: ColorThemeName
  themeMode: ThemeMode
  createdAt: Date
  updatedAt: Date
}
