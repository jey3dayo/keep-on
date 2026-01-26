/**
 * 習慣関連の定数定義
 */

/**
 * 期間の種類
 */
export type Period = 'daily' | 'weekly' | 'monthly'

/**
 * 期間のラベル（日本語）
 */
export const PERIOD_LABEL: Record<Period, string> = {
  daily: '日',
  weekly: '週',
  monthly: 'ヶ月',
} as const

/**
 * 期間のラベル（英語）
 */
export const PERIOD_LABEL_EN: Record<Period, string> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
} as const

/**
 * 期間の表示名
 */
export const PERIOD_DISPLAY_NAME: Record<Period, string> = {
  daily: 'デイリー',
  weekly: '週次',
  monthly: '月次',
} as const

/**
 * デフォルトの習慣カラー
 */
export const DEFAULT_HABIT_COLOR = 'orange'

/**
 * デフォルトの習慣アイコン
 */
export const DEFAULT_HABIT_ICON = 'droplets'

/**
 * デフォルトの目標回数
 */
export const DEFAULT_HABIT_FREQUENCY = 1

/**
 * デフォルトの期間
 */
export const DEFAULT_HABIT_PERIOD: Period = 'daily'

/**
 * 週の開始曜日（月曜日）
 */
export const WEEK_START_DAY = 1

/**
 * 週の終了曜日（日曜日）
 */
export const WEEK_END_DAY = 0

/**
 * OKLCHカラーのフォールバック値
 */
export const FALLBACK_OKLCH_COLOR = 'oklch(0.68 0.21 48)'

/**
 * 完了判定の閾値（目標達成率）
 */
export const COMPLETION_THRESHOLD = 100
