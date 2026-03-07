/**
 * 習慣の基本型（DBスキーマに対応）
 */
import type { Period } from '@/constants/habit'

export interface Habit {
  archived: boolean
  archivedAt: string | null
  color: string | null
  createdAt: string
  frequency: number
  icon: string | null
  id: string
  name: string
  period: Period
  reminderTime: string | null
  updatedAt: string
  userId: string
}

/**
 * 進捗情報を含む習慣型
 */
export interface HabitWithProgress extends Habit {
  /** 目標達成率（0-100） */
  completionRate: number
  /** 現在の期間での達成回数 */
  currentProgress: number
  /** 今日スキップ済みかどうか */
  skippedToday: boolean
  /** 連続達成日数 */
  streak: number
}

/**
 * チェックイン記録
 */
export interface HabitCheckin {
  createdAt: string
  date: string
  habitId: string
  id: string
}
