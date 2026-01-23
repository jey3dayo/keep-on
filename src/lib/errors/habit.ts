import { ErrorFactory } from '@praha/error-factory'

/**
 * 認証エラー
 * ユーザーが認証されていない場合に発生
 */
export class UnauthorizedError extends ErrorFactory({
  name: 'UnauthorizedError',
  message: 'User is not authenticated',
}) {}

/**
 * バリデーションエラー
 * 入力値のバリデーションに失敗した場合に発生
 */
export class ValidationError extends ErrorFactory({
  name: 'ValidationError',
  message: 'Validation failed',
  fields: ErrorFactory.fields<{ field: string; reason: string }>(),
}) {}

/**
 * データベースエラー
 * データベース操作に失敗した場合に発生
 */
export class DatabaseError extends ErrorFactory({
  name: 'DatabaseError',
  message: 'Database operation failed',
}) {}

/**
 * 習慣管理関連のエラー型の統合
 */
export type HabitError = UnauthorizedError | ValidationError | DatabaseError
