/**
 * 習慣関連の定数定義
 */

/**
 * 期間の種類
 */
export const PERIODS = ['daily', 'weekly', 'monthly'] as const
export type Period = (typeof PERIODS)[number]

/**
 * 期間のラベル（日本語）
 */
export const PERIOD_LABEL: Record<Period, string> = {
  daily: '日',
  weekly: '週',
  monthly: 'ヶ月',
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
 * デフォルトの習慣アイコン
 */
export const DEFAULT_HABIT_ICON = 'droplets' as const

/**
 * デフォルトの習慣カラー
 */
export const DEFAULT_HABIT_COLOR = 'orange' as const

/**
 * デフォルトの目標回数
 */
export const DEFAULT_HABIT_FREQUENCY = 1

/**
 * デフォルトの期間
 */
export const DEFAULT_HABIT_PERIOD: Period = 'daily'

/**
 * 週開始日の文字列型
 */
export type WeekStart = 'monday' | 'sunday'

/**
 * デフォルトの週開始日（文字列）
 */
export const DEFAULT_WEEK_START: WeekStart = 'monday'

/**
 * 週開始日の数値型
 */
export type WeekStartDay = 0 | 1 // 0 = Sunday, 1 = Monday

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
