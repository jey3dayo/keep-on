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
 * HabitErrorをFormStateに変換する
 *
 * @param error - 変換するエラー
 * @returns FormState
 */
export function handleHabitError(error: HabitError): FormState {
  switch (error.name) {
    case 'UnauthorizedError':
      return { error: 'Unauthorized', success: false }
    case 'ValidationError':
      return { error: error.reason, success: false }
    case 'DatabaseError':
      console.error('Failed to create habit:', error.cause)
      return { error: 'Failed to create habit', success: false }
    default: {
      const _exhaustive: never = error
      console.error('Unexpected error:', _exhaustive)
      return { error: 'An unexpected error occurred', success: false }
    }
  }
}
