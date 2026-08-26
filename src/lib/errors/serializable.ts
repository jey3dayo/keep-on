import type { HabitError } from './habit'

/**
 * シリアライズ可能なエラー型
 * Server ActionのレスポンスとしてRSC経由でクライアントに渡せる
 */
export type SerializableHabitError =
  | { name: 'UnauthorizedError' }
  | { name: 'AuthorizationError'; message: string }
  | { name: 'ValidationError'; field: string; reason: string }
  | { name: 'DatabaseError'; message: string }
  | { name: 'NotFoundError'; message: string }

/** 想定外の例外を画面へ返すときに使う、内部情報を含まない共通メッセージ */
export const GENERIC_ACTION_ERROR_MESSAGE = '操作に失敗しました。しばらくしてからもう一度お試しください'

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
    case 'AuthorizationError':
      return {
        message: error.message,
        name: 'AuthorizationError',
      }
    case 'ValidationError':
      return {
        field: error.field,
        name: 'ValidationError',
        reason: error.reason,
      }
    case 'DatabaseError':
      console.error('Database error:', error.cause)
      return {
        message: error.message,
        name: 'DatabaseError',
      }
    case 'NotFoundError':
      return {
        message: error.message,
        name: 'NotFoundError',
      }
    default: {
      const _exhaustive: never = error
      console.error('Unexpected error:', _exhaustive)
      return {
        message: 'An unexpected error occurred',
        name: 'DatabaseError',
      }
    }
  }
}

/**
 * シリアライズされたエラーをユーザー向けメッセージに変換
 *
 * @param error - シリアライズされたエラー
 * @returns ユーザー向けエラーメッセージ
 */
export function formatSerializableError(error: SerializableHabitError): string {
  switch (error.name) {
    case 'UnauthorizedError':
      return 'Unauthorized'
    case 'AuthorizationError':
      return error.message
    case 'ValidationError':
      return error.reason
    case 'DatabaseError':
      return error.message
    case 'NotFoundError':
      return error.message
    default: {
      const _exhaustive: never = error
      console.error('Unexpected error:', _exhaustive)
      return 'An unexpected error occurred'
    }
  }
}
