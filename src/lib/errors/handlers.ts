import type { HabitError } from './habit'

/**
 * FormStateの型定義
 * Server ActionからClient Componentに返される状態
 */
export interface FormState {
  error: string | null
  success: boolean
}

/**
 * エラーをFormStateに変換する汎用ハンドラー
 *
 * @param error - 変換するエラー
 * @param context - エラーコンテキスト（ログ用、省略可）
 * @returns FormState
 */
export function handleError(error: HabitError, context?: string): FormState {
  switch (error.name) {
    case 'UnauthorizedError':
      return { error: 'Unauthorized', success: false }
    case 'ValidationError':
      return { error: error.reason, success: false }
    case 'DatabaseError':
      console.error(context ? `${context}:` : 'Database error:', error.cause)
      return { error: 'Database operation failed', success: false }
    default: {
      const _exhaustive: never = error
      console.error('Unexpected error:', _exhaustive)
      return { error: 'An unexpected error occurred', success: false }
    }
  }
}

/**
 * @deprecated Use handleError instead
 */
export const handleHabitError = handleError
