/**
 * 習慣の基本型（DBスキーマに対応）
 */
import type { checkins, habits } from '@/db/schema'

export type Habit = typeof habits.$inferSelect

/**
 * 進捗情報を含む習慣型
 */
export interface HabitWithProgress extends Habit {
  /** 現在の期間での達成回数 */
  currentProgress: number
  /** 連続達成日数 */
  streak: number
  /** 目標達成率（0-100） */
  completionRate: number
}

/**
 * チェックイン記録
 */
export type HabitCheckin = typeof checkins.$inferSelect
