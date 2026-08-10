import { findInvalidEnvKeys } from '@/schemas/env'

/**
 * サーバー起動時に環境変数を検証する。
 *
 * 設定漏れはリクエスト処理中の 500 として現れ、原因の切り分けに時間がかかる。
 * リクエストを受ける前に落として、デプロイ時点で気づけるようにする。
 */
export function register() {
  const invalidKeys = findInvalidEnvKeys({
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  })

  if (invalidKeys.length > 0) {
    throw new Error(`Invalid environment variables: ${invalidKeys.join(', ')}`)
  }
}
