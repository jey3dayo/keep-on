import { ErrorFactory } from '@praha/error-factory'

/**
 * 認証エラー
 * ユーザーが認証されていない場合に発生
 */
export class UnauthorizedError extends ErrorFactory({
  name: 'UnauthorizedError',
  message: ({ detail }) => detail ?? 'User is not authenticated',
  fields: ErrorFactory.fields<{ detail?: string }>(),
}) {}

/**
 * 認可エラー
 * リソースへのアクセス権がない場合に発生
 */
export class AuthorizationError extends ErrorFactory({
  name: 'AuthorizationError',
  message: ({ detail }) => detail ?? 'User is not authorized',
  fields: ErrorFactory.fields<{ detail?: string }>(),
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
  message: ({ detail }) => detail ?? 'Database operation failed',
  fields: ErrorFactory.fields<{ detail?: string }>(),
}) {}

/**
 * NotFoundError
 * リソースが見つからない場合に発生
 */
export class NotFoundError extends ErrorFactory({
  name: 'NotFoundError',
  message: ({ detail }) => detail ?? 'Resource not found',
  fields: ErrorFactory.fields<{ detail?: string }>(),
}) {}

/**
 * 習慣管理関連のエラー型の統合
 */
export type HabitError = UnauthorizedError | AuthorizationError | ValidationError | DatabaseError | NotFoundError
