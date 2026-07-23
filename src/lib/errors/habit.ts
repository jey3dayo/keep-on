import { ErrorFactory } from '@praha/error-factory'

/**
 * 認証エラー
 * ユーザーが認証されていない場合に発生
 */
export class UnauthorizedError extends ErrorFactory({
  fields: ErrorFactory.fields<{ detail?: string }>(),
  message: ({ detail }) => detail ?? 'User is not authenticated',
  name: 'UnauthorizedError',
}) {}

/**
 * 認可エラー
 * リソースへのアクセス権がない場合に発生
 */
export class AuthorizationError extends ErrorFactory({
  fields: ErrorFactory.fields<{ detail?: string }>(),
  message: ({ detail }) => detail ?? 'User is not authorized',
  name: 'AuthorizationError',
}) {}

/**
 * バリデーションエラー
 * 入力値のバリデーションに失敗した場合に発生
 */
export class ValidationError extends ErrorFactory({
  fields: ErrorFactory.fields<{ field: string; reason: string }>(),
  message: 'Validation failed',
  name: 'ValidationError',
}) {}

/**
 * データベースエラー
 * データベース操作に失敗した場合に発生
 */
export class DatabaseError extends ErrorFactory({
  fields: ErrorFactory.fields<{ detail?: string }>(),
  message: ({ detail }) => detail ?? 'Database operation failed',
  name: 'DatabaseError',
}) {}

/**
 * NotFoundError
 * リソースが見つからない場合に発生
 */
export class NotFoundError extends ErrorFactory({
  fields: ErrorFactory.fields<{ detail?: string }>(),
  message: ({ detail }) => detail ?? 'Resource not found',
  name: 'NotFoundError',
}) {}

/**
 * 習慣管理関連のエラー型の統合
 */
export type HabitError = UnauthorizedError | AuthorizationError | ValidationError | DatabaseError | NotFoundError
