/**
 * 習慣関連の定数定義
 */

/**
 * 期間の種類
 */
export const PERIODS = ['daily', 'weekly', 'monthly'] as const
export type Period = (typeof PERIODS)[number]

/**
 * 期間の表示名
 */
export const PERIOD_DISPLAY_NAME: Record<Period, string> = {
  daily: 'デイリー',
  monthly: '月次',
  weekly: '週次',
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
 * 日付が切り替わる時刻（時）。24 は暦どおり、25〜29 は深夜帯を前日として扱う猶予時間
 */
export type DayStartHour = 24 | 25 | 26 | 27 | 28 | 29

/**
 * デフォルトの日付切り替え時刻（暦どおり）
 */
export const DEFAULT_DAY_START_HOUR: DayStartHour = 24

/**
 * 選択可能な日付切り替え時刻の一覧
 */
export const DAY_START_HOURS: readonly DayStartHour[] = [24, 25, 26, 27, 28, 29]

/**
 * 値が DayStartHour として妥当かを判定
 *
 * @param value - 判定対象の数値
 */
export function isDayStartHour(value: number): value is DayStartHour {
  return value === 24 || value === 25 || value === 26 || value === 27 || value === 28 || value === 29
}
