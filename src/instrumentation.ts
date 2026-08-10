import { logError } from '@/lib/logging'
import { findInvalidEnvKeys } from '@/schemas/env'

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
  const invalidKeys = findInvalidEnvKeys({
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  })

  if (invalidKeys.length > 0) {
    logError('instrumentation.env:invalid', { keys: invalidKeys })
  }
}
