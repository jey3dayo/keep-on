/**
 * 習慣の基本型（DBスキーマに対応）
 */
export interface Habit {
  id: string
  name: string
  icon: string | null
  color: string | null
  period: 'daily' | 'weekly' | 'monthly'
  frequency: number
  userId: string
  createdAt: Date
  updatedAt: Date
}

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
export interface HabitCheckin {
  id: string
  habitId: string
  userId: string
  checkedAt: Date
  createdAt: Date
}
