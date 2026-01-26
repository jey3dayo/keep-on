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
 * 週の開始曜日（デフォルト: 月曜日）
 *
 * Note: この値はサーバーサイドのデフォルト値です。
 * クライアントサイドでは useWeekStart() を使用してユーザー設定を取得してください。
 */
export const DEFAULT_WEEK_START_DAY = 1

/**
 * 週の終了曜日（日曜日）
 */
export const WEEK_END_DAY = 0

/**
 * 週開始日の文字列型
 */
export type WeekStart = 'monday' | 'sunday'

/**
 * 週開始日の数値型
 */
export type WeekStartDay = 0 | 1 // 0 = Sunday, 1 = Monday

/**
 * 週開始日設定を検証
 *
 * @param value - 検証する値
 * @returns 有効な週開始日 (0 | 1) かどうか
 */
export function isValidWeekStartDay(value: unknown): value is WeekStartDay {
  return value === 0 || value === 1
}

/**
 * 週開始日文字列を数値に変換
 *
 * @param weekStart - "monday" | "sunday"
 * @returns WeekStartDay (0 | 1)
 */
export function weekStartToDay(weekStart: WeekStart): WeekStartDay {
  return weekStart === 'monday' ? 1 : 0
}

/**
 * OKLCHカラーのフォールバック値
 */
export const FALLBACK_OKLCH_COLOR = 'oklch(0.68 0.21 48)'

/**
 * 完了判定の閾値（目標達成率）
 */
export const COMPLETION_THRESHOLD = 100

/**
 * 完了ステータスラベル
 */
export const COMPLETION_STATUS_LABEL = {
  completed: '完了',
  incomplete: '未完了',
} as const

/**
 * 完了アクションラベル
 */
export const COMPLETION_ACTION_LABEL = {
  markComplete: '完了にする',
  markIncomplete: '未完了にする',
} as const
