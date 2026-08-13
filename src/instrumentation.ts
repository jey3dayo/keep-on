import { isDevFallbackAllowed } from '@/lib/auth/environment'
import { logError } from '@/lib/logging'
import { findInvalidAccessEnvKeys } from '@/schemas/env'

/**
 * サーバー起動時に環境変数を検証する。
 *
 * 設定漏れはリクエスト処理中の 500 として現れ、原因の切り分けに時間がかかる。
 * 起動時にログへ出して、デプロイ直後に気づけるようにする。
 *
 * ここで throw しないのは、Next.js の registerInstrumentation が例外を再 throw し、
 * rejected promise をキャッシュするため。一度失敗すると同じ isolate の全リクエストが
 * 500 になり、設定を直しても isolate が入れ替わるまで回復しない。
 */
export function register() {
  // access.ts の開発フォールバック判定と同じ述語を使う。ここがずれると
  // 「認証は dev フォールバックで動いているのに設定不備を検出しない」状態になる
  const isProduction = !isDevFallbackAllowed()
  const invalidKeys = findInvalidAccessEnvKeys(
    {
      ACCESS_AUD: process.env.ACCESS_AUD,
      ACCESS_TEAM_DOMAIN: process.env.ACCESS_TEAM_DOMAIN,
    },
    isProduction
  )

  if (invalidKeys.length > 0) {
    logError('instrumentation.env:invalid', { keys: invalidKeys })
  }
}
