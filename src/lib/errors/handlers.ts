import type { HabitError } from './habit'

/**
 * エラーをユーザー向けメッセージに変換する汎用ヘルパー
 *
 * @param error - 変換するエラー
 * @param context - エラーコンテキスト（ログ用、省略可）
 * @returns ユーザー向けエラーメッセージ
 */
export function formatErrorMessage(error: HabitError, context?: string): string {
  switch (error.name) {
    case 'UnauthorizedError':
      return 'Unauthorized'
    case 'ValidationError':
      return error.reason
    case 'DatabaseError':
      if (context) {
        console.error(`${context}:`, error.cause)
      } else {
        console.error('Database error:', error.cause)
      }
      return 'Database operation failed'
    default: {
      const _exhaustive: never = error
      console.error('Unexpected error:', _exhaustive)
      return 'An unexpected error occurred'
    }
  }
}
