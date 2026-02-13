/**
 * Next.js Instrumentation
 * アプリケーション起動時に実行される
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Edge Runtime (Cloudflare Workers) でのみ Sentry を初期化
  // TODO: Sentry統合は後のフェーズで実装
  // 現在は @sentry/cloudflare の内部モジュールをNext.jsビルドで解決できないため、
  // 一時的に無効化しています。
  //
  // 実装時の参考:
  // - Issue #146 にセットアップ手順を記載済み
  // - CloudflareClient の初期化には makeCloudflareTransport と defaultStackParser が必須
  // - これらは @sentry/cloudflare/build/esm/ 配下にあるが、型定義が提供されていない
  //
  // if (process.env.NEXT_RUNTIME === 'edge') {
  //   await initSentryForEdge()
  // }
}
