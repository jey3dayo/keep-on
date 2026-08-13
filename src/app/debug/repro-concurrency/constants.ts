import { isDevFallbackAllowed } from '@/lib/auth/environment'

/**
 * 開発環境限定フラグ。
 *
 * このページは認証済みであれば誰でも Access 認証と D1 を 1 リクエストで
 * 最大 concurrency×iterations 回駆動できるため、本番・プレビューでは無効化する。
 */
export const IS_CONCURRENCY_DEBUG_ENABLED = isDevFallbackAllowed()

export const CONCURRENCY_LIMITS = {
  default: 10,
  max: 30,
  min: 1,
} as const

export const ITERATION_LIMITS = {
  default: 1,
  max: 5,
  min: 1,
} as const
