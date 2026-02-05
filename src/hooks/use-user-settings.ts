'use client'

import { useCallback, useEffect, useState } from 'react'
import { updateUserSettingsAction } from '@/app/actions/settings/updateUserSettings'
import { DEFAULT_WEEK_START } from '@/constants/habit'
import { DEFAULT_COLOR_THEME, DEFAULT_THEME_MODE } from '@/constants/theme'
import type { UpdateUserSettingsSchemaType } from '@/schemas/user-settings'
import type { UserSettings } from '@/types/user-settings'

interface UseUserSettings {
  settings: UserSettings | null
  updateSettings: (settings: UpdateUserSettingsSchemaType) => Promise<void>
  ready: boolean
  syncing: boolean
}

/**
 * ユーザー設定フック
 *
 * @param initialSettings - サーバーから取得した初期設定（省略可）
 * @returns ユーザー設定と更新関数
 */
export function useUserSettings(initialSettings?: UserSettings | null): UseUserSettings {
  const [settings, setSettings] = useState<UserSettings | null>(initialSettings ?? null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings)
    }
  }, [initialSettings])

  const updateSettings = useCallback(async (updates: UpdateUserSettingsSchemaType) => {
    setSyncing(true)
    try {
      const result = await updateUserSettingsAction(updates)

      if (result.ok) {
        setSettings(result.data)
      } else {
        console.error('Failed to update user settings:', result.error)
      }
    } catch (error) {
      console.error('Failed to update user settings:', error)
    } finally {
      setSyncing(false)
    }
  }, [])

  return {
    settings,
    updateSettings,
    ready: settings !== null,
    syncing,
  }
}

/**
 * デフォルトのユーザー設定を生成
 */
export function getDefaultUserSettings(userId: string): UserSettings {
  const now = new Date().toISOString()
  return {
    id: '',
    userId,
    weekStart: DEFAULT_WEEK_START,
    colorTheme: DEFAULT_COLOR_THEME,
    themeMode: DEFAULT_THEME_MODE,
    createdAt: now,
    updatedAt: now,
  }
}
