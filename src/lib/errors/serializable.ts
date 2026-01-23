import type { HabitError } from './habit'

/**
 * シリアライズ可能なエラー型
 * Server ActionのレスポンスとしてRSC経由でクライアントに渡せる
 */
export type SerializableHabitError =
  | { name: 'UnauthorizedError' }
  | { name: 'ValidationError'; field: string; reason: string }
  | { name: 'DatabaseError'; message: string }

/**
 * HabitErrorをシリアライズ可能な形式に変換
 *
 * @param error - 変換するエラー
 * @returns シリアライズ可能なエラーオブジェクト
 */
export function serializeHabitError(error: HabitError): SerializableHabitError {
  switch (error.name) {
    case 'UnauthorizedError':
      return { name: 'UnauthorizedError' }
    case 'ValidationError':
      return {
        name: 'ValidationError',
        field: error.field,
        reason: error.reason,
      }
    case 'DatabaseError':
      console.error('Database error:', error.cause)
      return {
        name: 'DatabaseError',
        message: 'Database operation failed',
      }
    default: {
      const _exhaustive: never = error
      console.error('Unexpected error:', _exhaustive)
      return {
        name: 'DatabaseError',
        message: 'An unexpected error occurred',
      }
    }
  }
}
